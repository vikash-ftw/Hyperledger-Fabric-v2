#!/bin/bash
# invoke smart contract

CHANNEL_NAME=samplechannel
CC_SRC_LANGUAGE=javascript
VERSION=1
DELAY=3
MAX_RETRY=5
VERBOSE=true
CHAINCODE_NAME="fabricLedgerContract"

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
export PEER0_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export PEER1_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt
export PEER2_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer2.org1.example.com/tls/ca.crt
export PEER3_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer3.org1.example.com/tls/ca.crt

setGlobalVarsForOrg1() {
  export CORE_PEER_LOCALMSPID="Org1MSP"
  export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
  # using peer0 of Org1
  export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
  export CORE_PEER_ADDRESS=localhost:${ORG1_PEERS_PORTS[0]}
}

invokeMakeProduct() {
    echo "--- Invoking makeProduct ---"
    setGlobalVarsForOrg1
    res=$?
    set -x
    peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n ${CHAINCODE_NAME} -c '{"function":"addProductDataOnChain","Args":["'C-001'","'INTEL'","'intel-i5'", "'Alan'"]}' >&./logs/invoke_CC_log.txt
    res=$?
    set +x
    cat ./logs/invoke_CC_log.txt
}

## invoke makeProduct function
invokeMakeProduct