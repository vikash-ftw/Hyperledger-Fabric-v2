#!/bin/bash

# create channel
# pass channel via arg -> createChannel.sh <channel name>

CHANNEL_NAME="$1"
: ${CHANNEL_NAME:="samplechannel"}

DELAY="3"
MAX_RETRY="2"
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

# Define an array of organization names
# ORG_NAMES=("Org1" "Org2" "Org3")
ORG_NAMES=("Org1")
TOTAL_PEERS_PER_ORG=4
ORG1_PEERS_PORTS=(7051 8051 5051 6051)

# Org and Peer related config tls cert variables
export CORE_PEER_LOCALMSPID="OrdererMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/ordererOrganizations/example.com/users/Admin@example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Org1 Peers
PEER0_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
PEER1_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt
PEER2_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer2.org1.example.com/tls/ca.crt
PEER3_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer3.org1.example.com/tls/ca.crt


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

createChannelTxn() {
	displayMsg "--- Creating ${CHANNEL_NAME} txn file ---"
	set -x
	configtxgen -profile SampleChannel -outputCreateChannelTx ./channel-artifacts/${CHANNEL_NAME}.tx -channelID $CHANNEL_NAME
	res=$?
	set +x
  	verifyResult $res "txn generated for $CHANNEL_NAME" "error in $CHANNEL_NAME txn generation!"
}

createAncorPeerTxn() {
	displayMsg "--- Creating org anchor peer txn for ${CHANNEL_NAME} ---"
	#for orgmsp in Org1MSP Org2MSP Org3MSP; do
    for orgmsp in Org1MSP; do
		displayMsg "--- Generating anchor peer update transaction for ${orgmsp} ---"
		set -x
		configtxgen -profile SampleChannel -outputAnchorPeersUpdate ./channel-artifacts/${orgmsp}anchors.tx -channelID $CHANNEL_NAME -asOrg ${orgmsp}
		res=$?
		set +x
		verifyResult $res "peer0 anchorTxn generated for ${orgmsp}" "error in generate anchor peer update transaction for ${orgmsp} failed"
	done
}

createChannel() {
	displayMsg "--- Creating the ${CHANNEL_NAME} ---"
	
	# Org1 will create this channel therefore setting global variables for it
	export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
    export CORE_PEER_ADDRESS=localhost:7051

	local rc=1
	local COUNTER=1
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
		sleep 1
		set -x
		peer channel create -o localhost:7050 -c $CHANNEL_NAME --ordererTLSHostnameOverride orderer.example.com -f ./channel-artifacts/${CHANNEL_NAME}.tx --outputBlock ./channel-artifacts/${CHANNEL_NAME}.block --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA >&./logs/create-channel-log.txt
		res=$?
		set +x
		let rc=$res
		COUNTER=$(expr $COUNTER + 1)
	done
	cat ./logs/create-channel-log.txt
	verifyResult $res "Channel ${CHANNEL_NAME} created successfully" "error in creating channel - ${CHANNEL_NAME}"
}

# Org and its peer join channel
joinChannel() {
	displayMsg "--- Channel - ${CHANNEL_NAME} Joining Phase ---"
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
				elif [ $i -eq 2 ]; then
					export CORE_PEER_TLS_ROOTCERT_FILE=$PEER2_ORG1_CA
					export CORE_PEER_ADDRESS=localhost:${ORG1_PEERS_PORTS[$i]}
				else
					export CORE_PEER_TLS_ROOTCERT_FILE=$PEER3_ORG1_CA
					export CORE_PEER_ADDRESS=localhost:${ORG1_PEERS_PORTS[$i]}
				fi

				# join peer to channel
				echo "-- InProcess Joining of peer${i} of ${org} to channel - ${CHANNEL_NAME} --"
				local rc=1
				local COUNTER=1
				while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
					sleep 1
					set -x
					peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block >&./logs/peer-channel-join-log.txt
					res=$?
					set +x
					let rc=$res
					COUNTER=$(expr $COUNTER + 1)
				done
				cat ./logs/peer-channel-join-log.txt
				verifyResult $res "peer${i} joined channel - ${CHANNEL_NAME}" "peer${i} failed to join channel - ${CHANNEL_NAME}"
				sleep 1
			done
		else
			echo "================== ERROR !!! ORG Unknown =================="
		fi
	done
}

updateAnchorPeers() {
	displayMsg "--- Defining Orgs Anchor Peer for channel - ${CHANNEL_NAME} ---"

	# for Org1 setting MSPID
	export CORE_PEER_LOCALMSPID="Org1MSP"
	local rc=1
	local COUNTER=1
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
		sleep 1
		set -x
		peer channel update -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL_NAME -f ./channel-artifacts/${CORE_PEER_LOCALMSPID}anchors.tx --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA >&./logs/anchorPeer-channel-log.txt
		res=$?
		set +x
		let rc=$res
		COUNTER=$(expr $COUNTER + 1)
	done
	cat ./logs/anchorPeer-channel-log.txt
	verifyResult $res "Anchor peer defined for channel - ${CHANNEL_NAME}" "Anchor peer in channel - ${CHANNEL_NAME} failed"
}

export FABRIC_CFG_PATH=${PWD}/configtx

## Create channeltx
echo "### Generating channel create transaction '${CHANNEL_NAME}.tx' ###"
createChannelTxn

## Create anchorpeertx
echo "### Generating anchor peer update transactions ###"
createAncorPeerTxn

export FABRIC_CFG_PATH=$PWD/../config/

## Create channel
createChannel

## Join all the peers to the channel
echo "Join Org peers to the channel..."
joinChannel

## Set the anchor peers for each org in the channel
echo "Updating anchor peers for org..."
updateAnchorPeers

echo
echo "========= Fabric Network Channel $CHANNEL_NAME successfully joined =========== "

echo
echo " _____   _   _   ____   "
echo "| ____| | \ | | |  _ \  "
echo "|  _|   |  \| | | | | | "
echo "| |___  | |\  | | |_| | "
echo "|_____| |_| \_| |____/  "
echo

exit 0