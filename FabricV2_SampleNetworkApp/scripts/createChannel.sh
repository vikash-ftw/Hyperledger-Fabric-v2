#!/bin/bash

# create channel
# pass channel via arg -> createChannel.sh <channel name>

CHANNEL_NAME="$1"
: ${CHANNEL_NAME:="samplechannel"}

MAX_RETRY="3"
VERBOSE="false"

echo
echo " ____    _____      _      ____    _____ "
echo "/ ___|  |_   _|    / \    |  _ \  |_   _|"
echo "\___ \    | |     / _ \   | |_) |   | |  "
echo " ___) |   | |    / ___ \  |  _ <    | |  "
echo "|____/    |_|   /_/   \_\ |_| \_\   |_|  "
echo
echo "Creating Fabric Network Channel - $CHANNEL_NAME"
echo

# Adding fabric bin to path
export PATH=${PWD}/../bin:$PATH

export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# orderer2
export ORDERER2_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer2.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Define an array of organization names
# ORG_NAMES=("Org1" "Org2" "Org3")
ORG_NAMES=("Org1")
TOTAL_PEERS_PER_ORG=2
ORG1_PEERS_PORTS=(7051 8051)

# Org and Peer related config tls cert variables
export CORE_PEER_LOCALMSPID="OrdererMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/ordererOrganizations/example.com/users/Admin@example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Org1 Peers
PEER0_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
PEER1_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt

if [ ! -d "channel-artifacts" ]; then
	mkdir channel-artifacts
fi

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

# New v2.5.9 channel creation methods
createChannelGenesisBlock() {
	displayMsg "--- Channel - ${CHANNEL_NAME} genesion block creation phase (NEW) ---"
	# Org1 will create the channel genesis therefore setting global variables for it
	export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
    export CORE_PEER_ADDRESS=localhost:7051

	set -x
	configtxgen -profile ChannelUsingRaft -outputBlock ./channel-artifacts/${CHANNEL_NAME}.block -channelID $CHANNEL_NAME
	res=$?
	set +x
	verifyResult $res "Generated channel configuration transaction for channel - ${CHANNEL_NAME}" "Failed to generate channel configuration transaction for channel - ${CHANNEL_NAME}"
}

createNewChannel() {
	displayMsg "--- Channel - ${CHANNEL_NAME} creation phase and ordered join phase (NEW) ---"
	# adding orderers
	export ORDERER_ADMIN_TLS_SIGN_CERT=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt
	export ORDERER_ADMIN_TLS_PRIVATE_KEY=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key

	# orderer2
	export ORDERER2_ADMIN_TLS_SIGN_CERT=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer2.example.com/tls/server.crt
	export ORDERER2_ADMIN_TLS_PRIVATE_KEY=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer2.example.com/tls/server.key

	# orderers join channel - (*IMP - use ORDERER_ADMIN_LISTENADDRESS port value in -o)
	set -x
	osnadmin channel join --channelID ${CHANNEL_NAME} --config-block ./channel-artifacts/${CHANNEL_NAME}.block -o localhost:7053 --ca-file "$ORDERER_CA" --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY"
	res=$?
	set +x
	verifyResult $res "Channel - ${CHANNEL_NAME} created and orderer joined the channel" "Failed to create channel - ${CHANNEL_NAME} and join orderer"

	set -x
	osnadmin channel join --channelID ${CHANNEL_NAME} --config-block ./channel-artifacts/${CHANNEL_NAME}.block -o localhost:8053 --ca-file "$ORDERER2_CA" --client-cert "$ORDERER2_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER2_ADMIN_TLS_PRIVATE_KEY"
	res=$?
	set +x
	verifyResult $res "Channel - ${CHANNEL_NAME} created and orderer2 joined the channel" "orderer2 Failed to join channel - ${CHANNEL_NAME}"
}

# Org and its peer join channel
joinNewChannel() {
	displayMsg "--- Channel - ${CHANNEL_NAME} Joining Phase (NEW) ---"
	# org loop
	for org in "${ORG_NAMES[@]}"; do
		echo "-- Using organization ${org} --"
		if [ "$org" = "Org1" ]; then
			export CORE_PEER_LOCALMSPID="Org1MSP"
			export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
			# peer loop
			for i in $(seq 0 $(($TOTAL_PEERS_PER_ORG - 1))); do
				if [ $i -eq 0 ]; then
					export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
					export CORE_PEER_ADDRESS=localhost:${ORG1_PEERS_PORTS[$i]}
				elif [ $i -eq 1 ]; then
					export CORE_PEER_TLS_ROOTCERT_FILE=$PEER1_ORG1_CA
					export CORE_PEER_ADDRESS=localhost:${ORG1_PEERS_PORTS[$i]}
				fi

				# join peer to channel
				echo "-- InProcess Joining of peer${i} of ${org} to channel - ${CHANNEL_NAME} --"
				local rc=1
				local COUNTER=0
				while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
					sleep 1
					if [ $COUNTER -gt 0 ]; then
						echo "Command Failed - Retrying ..."
						echo "-- Retry Attempt $COUNTER --"
						sleep 2
					fi
					set -x
					peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block >&./logs/peer-channel-join-log.txt
					res=$?
					set +x
					rc=$res
					COUNTER=$((COUNTER + 1))
					cat ./logs/peer-channel-join-log.txt
				done
				verifyResult $res "peer${i} joined channel - ${CHANNEL_NAME}" "peer${i} Failed to join channel - ${CHANNEL_NAME}!"
				sleep 1
			done
		else
			echo "================== ERROR !!! ORG Unknown =================="
		fi
	done
}

# create AnchorPeer txn id
# NOTE: This requires jq and configtxlator for execution.
createNewAncorPeerUpdate() {
	displayMsg "--- Creating org anchor peer update for ${CHANNEL_NAME} (NEW) ---"
	
	# FetchChannelConfig Part
	echo "---- Fetch Channel config section ----"

	echo "Fetching the most recent configuration block for the channel"
	export CORE_PEER_LOCALMSPID="Org1MSP"
	set -x
	peer channel fetch config ${PWD}/channel-artifacts/config_block.pb -o "localhost:7050 localhost:8050" -c $CHANNEL_NAME --tls --cafile "$ORDERER_CA $ORDERER2_CA" --ordererTLSHostnameOverride "orderer.example.com orderer2.example.com" 

	res=$?
	set +x
	verifyResult $res "Generated config_block.pb" "Failed to generated config_block.pb"
	
	OUTPUT=${PWD}/channel-artifacts/${CORE_PEER_LOCALMSPID}config.json

	echo "Decoding config block to JSON and isolating config to ${OUTPUT}"
	set -x
	configtxlator proto_decode --input ${PWD}/channel-artifacts/config_block.pb --type common.Block --output ${PWD}/channel-artifacts/config_block.json
	jq .data.data[0].payload.data.config ${PWD}/channel-artifacts/config_block.json > ${OUTPUT}
	res=$?
	set +x
	verifyResult $res "Parsed Channel configuration successfully" "Failed to parse channel configuration, make sure you have jq installed"
	# FetchChannelConfig Part till here
	
	# Takes an original and modified config, and produces the config update tx
	echo "Generating anchor peer update tx file for Org on channel ${CHANNEL_NAME}"
	
	# Define your anchor peer HOST and PORT here
	HOST="peer0.org1.example.com"
	PORT=7051

	set -x
	# Modify the configuration to append the anchor peer
	jq '.channel_group.groups.Application.groups.'${CORE_PEER_LOCALMSPID}'.values += {"AnchorPeers":{"mod_policy": "Admins","value":{"anchor_peers": [{"host": "'$HOST'","port": '$PORT'}]},"version": "0"}}' ${PWD}/channel-artifacts/${CORE_PEER_LOCALMSPID}config.json > ${PWD}/channel-artifacts/${CORE_PEER_LOCALMSPID}modified_config.json
	res=$?
	set +x
	verifyResult $res "Channel configuration update for anchor peer PASSED" "Channel configuration update for anchor peer FAILED, make sure you have jq installed"

	# createConfigUpdate Part
	ORIGINAL=${PWD}/channel-artifacts/${CORE_PEER_LOCALMSPID}config.json
	MODIFIED=${PWD}/channel-artifacts/${CORE_PEER_LOCALMSPID}modified_config.json
	OUTPUT=${PWD}/channel-artifacts/${CORE_PEER_LOCALMSPID}anchors.tx

	echo "config.json to protobuf conversion"
	set -x
	configtxlator proto_encode --input "${ORIGINAL}" --type common.Config --output ${PWD}/channel-artifacts/original_config.pb
	res=$?
	set +x
	verifyResult $res "Original config json converted to Protobuf" "Failed to convert json to Protobuf"

	echo "modified_config.json to protobuf conversion"
	set -x
	configtxlator proto_encode --input "${MODIFIED}" --type common.Config --output ${PWD}/channel-artifacts/modified_config.pb
	res=$?
	set +x
	verifyResult $res "Modified config.json converted to Protobuf" "Failed to convert json to Protobuf"

	echo "Computing the difference between Original Protobuf with Modified Protobuf"
	set -x
	configtxlator compute_update --channel_id $CHANNEL_NAME --original ${PWD}/channel-artifacts/original_config.pb --updated ${PWD}/channel-artifacts/modified_config.pb --output ${PWD}/channel-artifacts/config_update.pb
	res=$?
	set +x
	verifyResult $res "Generated new config_update protobuf file" "Failed to generated new config_update protobuf file"

	echo "Converting config_update protobuf file to JSON format"
	set -x 
	configtxlator proto_decode --input ${PWD}/channel-artifacts/config_update.pb --type common.ConfigUpdate --output ${PWD}/channel-artifacts/config_update.json
	res=$?
	set +x
	verifyResult $res "Converted config_update protobuf to json format" "Failed to convert protobuf to json format"

	echo '{"payload":{"header":{"channel_header":{"channel_id":"'$CHANNEL_NAME'", "type":2}},"data":{"config_update":'$(cat ${PWD}/channel-artifacts/config_update.json)'}}}' | jq . > ${PWD}/channel-artifacts/config_update_in_envelope.json

	echo "Generating orgMSP anchor tx file"
	set -x
	configtxlator proto_encode --input ${PWD}/channel-artifacts/config_update_in_envelope.json --type common.Envelope --output "${OUTPUT}"
	res=$?
	set +x
	verifyResult $res "Generated orgMSP anchor tx file" "Failed to generate orgMSP anchor tx file"
 
	echo "--- Creating org anchor peer update for ${CHANNEL_NAME} (NEW) DONE SUCCESSFULLY ---"
}

# update channel to add Anchor Peer
updateNewAnchorPeers() {
	displayMsg "--- Defining Orgs Anchor Peer for channel - ${CHANNEL_NAME} (NEW) ---"

	# for Org1 setting MSPID
	export CORE_PEER_LOCALMSPID="Org1MSP"
	export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
	export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
	export CORE_PEER_ADDRESS=localhost:7051

	local rc=1
	local COUNTER=0
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
		sleep 1
		if [ $COUNTER -gt 0 ]; then
			echo "Command Failed - Retrying ..."
			echo "-- Retry Attempt $COUNTER --"
			sleep 2
		fi
		set -x
		peer channel update -o localhost:7050 -c $CHANNEL_NAME -f ./channel-artifacts/${CORE_PEER_LOCALMSPID}anchors.tx --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA --ordererTLSHostnameOverride "orderer.example.com" >&./logs/anchorPeer-channel-log.txt
		res=$?
		set +x
		rc=$res
		COUNTER=$((COUNTER + 1))
		cat ./logs/anchorPeer-channel-log.txt
	done
	verifyResult $res "Anchor peer defined for channel - ${CHANNEL_NAME}" "Failed to update Anchor peer in channel - ${CHANNEL_NAME}!"
}

export FABRIC_CFG_PATH=${PWD}/configtx
echo "### Creating Channel - ${CHANNEL_NAME} Genesis Block ###"
createChannelGenesisBlock

echo "### Creating new channel - ${CHANNEL_NAME} ###"
createNewChannel

export FABRIC_CFG_PATH=$PWD/../config/
echo "### Join org peer to the channel - ${CHANNEL_NAME} ###"
joinNewChannel

## Use these anchor peer functions if you want to update anchor peer other than mentioned in configtx.yaml file
# echo "### Creating Anchor Peer txn for channel - ${CHANNEL_NAME} ###"
# createNewAncorPeerUpdate

# echo "### Updating channel - ${CHANNEL_NAME} for anchor peers ###"
# updateNewAnchorPeers

echo
echo "========= Fabric Network Channel $CHANNEL_NAME successfully created =========== "

echo
echo " _____   _   _   ____   "
echo "| ____| | \ | | |  _ \  "
echo "|  _|   |  \| | | | | | "
echo "| |___  | |\  | | |_| | "
echo "|_____| |_| \_| |____/  "
echo

exit 0