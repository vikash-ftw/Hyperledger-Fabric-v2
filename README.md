---- Steps to run Fabric V2 network ----

** Fresh Setup on New Machine **

1. Make sure to remove files if any present under /var/hyperledger/ directory of your system.

2. Run ./loadFabricDependencies.sh -> to install all fabric binaries of specific version in your cloned project repo.
   -- Check new folders created by running above script - bin, config and fabric-samples dir created.
3. Change ledger stateDatabase in downloaded fabric base config files -> go to ./config folder and open 'core.yaml' file
   -- We are using CouchDB to handle our stateDatabase therefore in core.yaml go to 'ledger' section
   -- And change 'stateDatabase' parameter from goleveldb -> CouchDB :- Ex. 'stateDatabase: CouchDB'
   -- Save your changes and close the file.

> :memo: **Note:** From now on 'FabricV2_SampleNetworkApp' will be our project_home.

4. Run ./scripts/start_fabric-ca.sh from project_home dir -> to start fabric-ca containers needed for crypto-materials
   -- Check new fabric ca containers will be up and running.
   -- also check fabric-ca (volume dir for fabric-ca containers) created under ./organizations

5. Run ./scripts/registerEnroll.sh from project_home -> to create crypto-materials for peers and orderers
   -- Check out ordererOrganizations and peerOrganizations folders under ./organizations containing all crypto-materials related to peers and orderers.

6. Run ./organizations/ccp-generate.sh from project_home -> to create CCP profiles files details under ./organizations/peerOrganizations dir
   -- Check out ./organizations/peerOrganizations/org1.example.com/connection-org1.json and connection-org1.yaml files created by script

7. Run ./createFirstGenesisBlock.sh from project_home -> to create genesis block of our network
   -- Check out ./system-genesis-block folder created under project_home containing genesis.block file

8. Run ./scripts/start_network.sh from project_home -> to create peers, orderers and couchDB and other containers
   -- Check out new peers, orderers and couchDB containers up and running
   -- Also check out /var/hyperledger/ folder (volume dir for all the created containers)

9. Run ./scripts/createChannel.sh from project_home -> to create a channel related files and join all peers on this channel
   -- Check out ./channel-artifacts dir containing 3 files :- anchor and channel .tx files and also .block file

10. Run ./scripts/deploySmartContract.sh from project_home -> to package, install, approve, commit (New Lifecycle 4 step process) for chaincode
    -- Check out ./fabricLedgerContract.tar.gz (packaged chaincode file)
    -- Also check out new dev-peer docker containers up and running to handle chaincode invocation request
11. (For Testing Chaincode invocation) Run ./scripts/invokeContract.sh from project_home -> to check if chaincode is working via 'peer chaincode invoke' command
    -- Check if invoked transaction is committed or failed - if committed then chaincode is fine and ready to handle app request

12. Now go to './organizations/clientOrg/app' directory for all the application related work
    -> Run 'npm install' (Node version must be v20.14)
    -> Now Run 'npm run start' (start our node server)
    -- If all goes well without any error while server start then check out -
    -- Check out './organizations/clientOrg/app/identity' folder container waller identities for admin and user
    -- Newly created user identity using fabric CA will be used to invoke chaincode on our network.

13. Now our client app is ready to handle request and invoke chaincode - now test the controllers
