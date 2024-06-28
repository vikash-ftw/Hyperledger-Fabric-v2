#!/bin/bash
# deploy smart contract

CHANNEL_NAME="$1"
VERSION="$2"
DELAY="$3"
MAX_RETRY="$4"
VERBOSE="$5"
: ${CHANNEL_NAME:="samplechannel"}
: ${VERSION:="1"}
: ${DELAY:="3"}
: ${MAX_RETRY:="3"}
: ${VERBOSE:="false"}
CC_SRC_LANGUAGE="javascript"
CC_SRC_LANGUAGE=`echo "$CC_SRC_LANGUAGE" | tr [:upper:] [:lower:]`
CC_RUNTIME_LANGUAGE=node # chaincode runtime language is node.js
CC_SRC_PATH="organizations/clientOrg/contract/"
CHAINCODE_NAME="fabricLedgerContract"

echo
echo " ____    _____      _      ____    _____ "
echo "/ ___|  |_   _|    / \    |  _ \  |_   _|"
echo "\___ \    | |     / _ \   | |_) |   | |  "
echo " ___) |   | |    / ___ \  |  _ <    | |  "
echo "|____/    |_|   /_/   \_\ |_| \_\   |_|  "
echo
echo "Deploy smart contract fabric blockchain in Channel - $CHANNEL_NAME"
echo
echo "Chaincode Name - $CHAINCODE_NAME with version - $VERSION"
echo

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

setGlobalVarsForOrg1() {
  export CORE_PEER_LOCALMSPID="Org1MSP"
  export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
  # using peer0 of Org1
  export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
  export CORE_PEER_ADDRESS=localhost:${ORG1_PEERS_PORTS[0]}
}

packageChaincode() {
  displayMsg "--- Packaging Chaincode with name ${CHAINCODE_NAME} v${VERSION} ---"
  # to package chaincode use Any one adminstrative Org
  # using Org1 configs
  local ORG=""
  ORG=${ORG_NAMES[0]} # usign Org1 from Org array
  setGlobalVarsForOrg1
  set -x
  peer lifecycle chaincode package ${CHAINCODE_NAME}.tar.gz --path ${CC_SRC_PATH} --lang ${CC_RUNTIME_LANGUAGE} --label ${CHAINCODE_NAME}_v${VERSION} >&./logs/pkg_chaincode_log.txt
  res=$?
  set +x
  cat ./logs/pkg_chaincode_log.txt
  verifyResult $res "Packaged on peer0 of ${ORG}" "Chaincode packaging on peer0 of ${ORG} has failed"
}


# installChaincode PEER ORG
installChaincode() {
  displayMsg "--- Installing Chaincode on Orgs peers ---"
  ## install chaincode in every peer
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

				# install chaincode on peer
				echo "-- InProcess installing chaincode on peer${i} of ${org} --"
				set -x
        peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz >&./logs/install_chaincode_log.txt
        res=$?
        set +x
				cat ./logs/install_chaincode_log.txt
				verifyResult $res "peer${i} of chaincode installed" "peer${i} failed to install chaincode"
				sleep 2
			done
		else
			echo "================== ERROR !!! ORG Unknown =================="
		fi
	done
}

# queryInstalled PEER ORG
queryInstalled() {
  displayMsg "--- Querying Chaincode to check if installed ---"
  ## query installed chaincode status only one peer
  local ORG=""
  ORG=${ORG_NAMES[0]} # usign Org1 from Org array
  setGlobalVarsForOrg1
  set -x
  peer lifecycle chaincode queryinstalled >&./logs/query_install_chaincode_log.txt
  res=$?
  set +x
  cat ./logs/query_install_chaincode_log.txt
	PACKAGE_ID=$(sed -n "/${CHAINCODE_NAME}_v${VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" ./logs/query_install_chaincode_log.txt)
  verifyResult $res "Query installed on peer0 of ${ORG}" "Query install on peer0 of ${ORG} has FAILED!"
}

# approveForMyOrg VERSION PEER ORG (include Channel specs)
approveForMyOrg() {
  displayMsg "--- Approving Chaincode for every Org ---"
  ## approve chaincode by org - only one peer of approving Org
  local ORG=""
  ORG=${ORG_NAMES[0]} # usign Org1 from Org array
  setGlobalVarsForOrg1
  sleep 2
  set -x
  peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name ${CHAINCODE_NAME} --version ${VERSION}  --package-id ${PACKAGE_ID} --sequence ${VERSION} >&./logs/approve_org_log.txt
  res=$?
  set +x
  cat ./logs/approve_org_log.txt
  verifyResult $res "Chaincode definition approved on peer0 of ${ORG} on channel '$CHANNEL_NAME' SUCCESSFULL" "Chaincode definition approved on peer0 of ${ORG} on channel '$CHANNEL_NAME' FAILED!"
}

# checkCommitReadiness VERSION PEER ORG (include Channel specs)
checkCommitReadiness() {
  displayMsg "--- Checking Commit readiness of every Org ---"
  ## check commit readiness - only one peer of approving Org
  local ORG=""
  ORG=${ORG_NAMES[0]} # usign Org1 from Org array
  setGlobalVarsForOrg1
  echo "Attempting to check the commit readiness of the chaincode definition on peer0 of ${ORG}, Retry after $DELAY seconds."
  sleep 2
  set -x
  peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name ${CHAINCODE_NAME} --version ${VERSION} --sequence ${VERSION} --output json >&./logs/commitReadiness_chaincode_log.txt
  res=$?
  set +x
  cat ./logs/commitReadiness_chaincode_log.txt
  verifyResult $res "Chaincode commit readiness done on peer0 of ${ORG} for channel '$CHANNEL_NAME'" "Chaincode commit readiness FAILED! on peer0 of ${ORG} for channel '$CHANNEL_NAME'"
}

# commitChaincodeDefinition VERSION PEER ORG (PEER ORG) (include Channel specs)
commitChaincodeDefinition() {
  displayMsg "--- Commiting the Chaincode on every Org ---"
  ## commit chaincode definition - Only one peer of approved Org
  local ORG=""
  ORG=${ORG_NAMES[0]} # usign Org1 from Org array
  setGlobalVarsForOrg1
  # while 'peer chaincode' command can get the orderer endpoint from the
  # peer (if join was successful), let's supply it directly as we know
  # it using the "-o" option
  sleep 2
  set -x
  peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name ${CHAINCODE_NAME} --version ${VERSION} --sequence ${VERSION} >&./logs/chaincode_peer_commit_log.txt
  res=$?
  set +x
  cat ./logs/chaincode_peer_commit_log.txt
  verifyResult $res "Chaincode commit on ${CHANNEL_NAME} in endorsing peer of ${ORG} SUCCESS" "Chaincode commit on ${CHANNEL_NAME} in endorsing peer of ${ORG} Failed!"
}

# queryCommitted ORG (include Channel specs)
queryCommitted() {
  displayMsg "--- Checking the committed Chaincodes on Channel - '$CHANNEL_NAME' ---"
  ## Querying All Chaincode definitions on the given channel
  local ORG=""
  ORG=${ORG_NAMES[0]} # usign Org1 from Org array
  setGlobalVarsForOrg1
  echo "Attempting to Query committed status on peers of ${ORG} "
  sleep 2
  set -x
  peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --output json >&./logs/query_commit_chaincode_log.txt
  res=$?
  set +x
  echo
  cat ./logs/query_commit_chaincode_log.txt
  verifyResult $res "Query commit success on ${ORG} on channel '$CHANNEL_NAME'" "Query commit FAILED! on ${ORG} on channel '$CHANNEL_NAME'"
}

## at first we package the chaincode
packageChaincode

## Install chaincode on all org peers
installChaincode 
## query whether the chaincode is installed
queryInstalled

## approve Org1
approveForMyOrg 
## check whether the chaincode definition is ready to be committed, orgs one should be approved
checkCommitReadiness

## similarly approve for other orgs if you have

## now that we know for sure called orgs have approved, commit the definition
commitChaincodeDefinition

## query on all orgs to see that the definition committed successfully
queryCommitted

echo
echo "========= Fabric smart contract successfully deployed on channel $CHANNEL_NAME  =========== "

echo
echo " _____   _   _   ____   "
echo "| ____| | \ | | |  _ \  "
echo "|  _|   |  \| | | | | | "
echo "| |___  | |\  | | |_| | "
echo "|_____| |_| \_| |____/  "
echo

exit 0