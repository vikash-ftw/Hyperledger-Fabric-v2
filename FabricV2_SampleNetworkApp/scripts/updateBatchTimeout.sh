#!/bin/bash
CHANNEL_NAME=${1:-samplechannel}
NEW_BATCH_TIMEOUT=${2:-"2s"}

echo "--- BATCH TIMEOUT CONFIG SCRIPT ---"

# ORDERER_CA=${PWD}/../organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem
# CORE_PEER_MSPCONFIGPATH=${PWD}/../organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
# CORE_PEER_ADDRESS=localhost:7051
# CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/../organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem
# CORE_PEER_LOCALMSPID=Org1MSP

## setOrgEnv logic - by Vikash Batham
# Adding fabric bin to path
export PATH=${PWD}/../bin:$PATH

# Adding fabric config 
export FABRIC_CFG_PATH=$PWD/../config/

export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Org related Global varibles that will be set in setGlobalVars() method
export CORE_PEER_LOCALMSPID=""
export CORE_PEER_TLS_ROOTCERT_FILE=""
export CORE_PEER_MSPCONFIGPATH=""
export CORE_PEER_ADDRESS=""

# Define an array of organization names
# ORG_NAMES=("Org1" "Org2" "Org3")
ORG_NAMES=("Org1")
TOTAL_PEERS_PER_ORG=4
ORG1_PEERS_PORTS=(7051 8051 5051 6051)

# Org1 Peers
PEER0_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
PEER1_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt
PEER2_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer2.org1.example.com/tls/ca.crt
PEER3_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer3.org1.example.com/tls/ca.crt


setGlobalVarsForOrg1() {
  export CORE_PEER_LOCALMSPID="Org1MSP"
  export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
  # using peer0 of Org1
  export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
  export CORE_PEER_ADDRESS=localhost:${ORG1_PEERS_PORTS[0]}
}

setGlobalVarsForOrg1

displayMsg() {
    msg=$1
    echo "====== ${msg} ====="
}

verifyResult() {
  if [ $1 -eq 0 ]; then
    echo "SUCCESS: $2"
  else
    echo "ERROR: $3"
    exit 1
  fi
  echo
}

displayMsg "--- BATCH TIMEOUT -> Fetching config from channel - ${CHANNEL_NAME} ---"
set -x
peer channel fetch config ./temp/config_block.pb -o localhost:7050 -c $CHANNEL_NAME --tls --cafile $ORDERER_CA >&./logs/fetch-channel-config_ubt.txt
res=$?
set +x
cat ./logs/fetch-channel-config_ubt.txt
verifyResult $res "config fetched from channel - ${CHANNEL_NAME}" "Failed in fetching config from channel - ${CHANNEL_NAME}!"

sleep 2
displayMsg "--- Extracting config into json format for channel - ${CHANNEL_NAME} ---"
set -x
configtxlator proto_decode --input ./temp/config_block.pb --type common.Block --output ./temp/config_block.json
jq '.data.data[0].payload.data.config' ./temp/config_block.json > ./temp/config.json
res=$?
set +x
verifyResult $res "extracted to json for channel - ${CHANNEL_NAME}" "Failed extraction for channel - ${CHANNEL_NAME}!"

sleep 2
BATCH_TIMEOUT="channel_group.groups.Orderer.values.BatchTimeout.value.timeout"

echo "Current Batch Timeout is $(jq ".$BATCH_TIMEOUT" ./temp/config.json)"
echo "-- New requested Batch Timeout is ${NEW_BATCH_TIMEOUT} --"

sleep 2
jq --arg key "$BATCH_TIMEOUT" --arg val "$NEW_BATCH_TIMEOUT" 'setpath($key | split("."); $val)' ./temp/config.json > ./temp/modified_config.json

sleep 1
configtxlator proto_encode --input ./temp/config.json --type common.Config --output ./temp/config.pb

sleep 2
configtxlator proto_encode --input ./temp/modified_config.json --type common.Config --output ./temp/modified_config.pb

sleep 2
configtxlator compute_update --channel_id $CHANNEL_NAME --original ./temp/config.pb --updated ./temp/modified_config.pb --output ./temp/final_update.pb

sleep 2
configtxlator proto_decode --input ./temp/final_update.pb --type common.ConfigUpdate --output ./temp/final_update.json

echo "{\"payload\":{\"header\":{\"channel_header\":{\"channel_id\":\"$CHANNEL_NAME\", \"type\":2}},\"data\":{\"config_update\":"$(cat ./temp/final_update.json)"}}}" | jq . >  ./temp/header_in_envolope.json

sleep 2
configtxlator proto_encode --input ./temp/header_in_envolope.json --type common.Envelope --output ./temp/final_update_in_envelope.pb

sleep 2
peer channel signconfigtx -f ./temp/final_update_in_envelope.pb

CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt
CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/ordererOrganizations/example.com/users/Admin@example.com/msp
CORE_PEER_ADDRESS=localhost:7050
CORE_PEER_LOCALMSPID=OrdererMSP

sleep 2

displayMsg "-- Final update in process for channel - ${CHANNEL_NAME} --"
set -x
peer channel update -f ./temp/final_update_in_envelope.pb -c $CHANNEL_NAME -o localhost:7050 --tls --cafile $ORDERER_CA >&./logs/final-channel-update_ubt.txt

res=$?
set +x
cat ./logs/final-channel-update_ubt.txt
verifyResult $res "BATCH TIMEOUT updated for channel - ${CHANNEL_NAME}" "BATCH TIMEOUT updation failed for channel - ${CHANNEL_NAME} !"