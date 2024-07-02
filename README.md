## ---- Steps to run Fabric V2 network ----

### **-- Fresh Setup on New Machine --**

1. Make sure to remove files if any present under /var/hyperledger/ directory of your system.

2. Run _./loadFabricDependencies.sh_ -> to install all fabric binaries of specific version in your cloned project repo.
   -- Check new folders created by running above script - bin, config and fabric-samples dir created.
3. Change ledger stateDatabase in downloaded fabric base config files -> go to ./config folder and open _core.yaml_ file
   -- We are using CouchDB to handle our stateDatabase therefore in core.yaml go to 'ledger' section
   -- And change 'stateDatabase' parameter from goleveldb -> CouchDB :- Ex. 'stateDatabase: CouchDB'
   -- Save your changes and close the file.

> :memo: **Note:** We can generate crypto-materials via cryptogen(For testing and development purpose) or Fabric CA(For Production purpose) - We will use Fabric CA in our case.
> :memo: **Note:** From now on 'FabricV2_SampleNetworkApp' will be our project_home.

4. Run _./scripts/start_fabric-ca.sh_ from project_home dir -> to start fabric-ca containers needed for crypto-materials
   -- Check new fabric ca containers will be up and running.
   -- also check fabric-ca (volume dir for fabric-ca containers) created under ./organizations

5. Run _./scripts/registerEnroll.sh_ from project_home -> to create crypto-materials for peers and orderers
   -- Check out ordererOrganizations and peerOrganizations folders under ./organizations containing all crypto-materials related to peers and orderers.

6. Run _./organizations/ccp-generate.sh_ from project_home -> to create CCP(Common Connection Profile) files details under ./organizations/peerOrganizations dir
   -- Check out ./organizations/peerOrganizations/org1.example.com/connection-org1.json and connection-org1.yaml files created by script

7. Run _./createFirstGenesisBlock.sh_ from project_home -> to create genesis block of our network
   -- Check out ./system-genesis-block folder created under project_home containing genesis.block file

8. Run _./scripts/start_network.sh_ from project_home -> to create peers, orderers and couchDB and other containers
   -- Check out new peers, orderers and couchDB containers up and running
   -- Also check out /var/hyperledger/ folder (volume dir for all the created containers)

9. Run _./scripts/createChannel.sh_ from project_home -> to create a channel related files and join all peers on this channel
   -- Check out ./channel-artifacts dir containing 3 files :- anchor and channel .tx files and also .block file

10. Run _./scripts/deploySmartContract.sh_ from project_home -> to package, install, approve, commit (New Lifecycle 4 step process) for chaincode
    -- Check out ./fabricLedgerContract.tar.gz (packaged chaincode file)
    -- Also check out new dev-peer docker containers up and running to handle chaincode invocation request
11. (For Testing Chaincode invocation) Run _./scripts/invokeContract.sh_ from project_home -> to check if chaincode is working via 'peer chaincode invoke' command
    -- Check if invoked transaction is committed or failed - if committed then chaincode is fine and ready to handle app request

12. Now go to './organizations/clientOrg/app' directory for all the application related work
    -> Run _npm install_ (Node version must be v20.14)
    -> Now Run _npm run start_ (start our node server)
    -- If all goes well without any error while server start then check out -
    -- Check out './organizations/clientOrg/app/identity' folder container waller identities for admin and user
    -- Newly created user identity using fabric CA will be used to invoke chaincode on our network.

13. Now our client app is ready to handle request and invoke chaincode - now test the controllers

### **-- Setup Hyperledger Explorer for Dashboard Monitoring --**

1. Copy the **orderersOrganizations** and **peerOrganizations** from your already running fabric network's **organizations** directory into **./fabric-explorer/organizations** directory.

2. Make sure the fabric network's 'COMPOSE_PROJECT_NAME' should be mention same as in .env file in ./fabric-explorer

3. Now edit **.connection-profile/test-network.json** file and make changes ->

   - change "name" key to your running fabric network's name.
   - go to 'organizations' key and change the priv_sk to private key in exist in your copied peerOrganizations folder '"adminPrivateKey": {
     "path": "/tmp/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/priv_sk"}'
     **copy your private key from keystore : priv_sk -> <your-key>\_sk**

4. Same network to be mentioned in **config.json** file under 'network-configs' key attribute.

   - Under 'network-configs' -> "name" can be any name you want to give to your explorer dashboard

5. Now in **./docker-compose.yaml** file -- edit 'networks' just like you mentioned in your fabric's docker-compose network files. **So that explorer containers are created in same network as your fabric network**

6. After all these changes : Run _docker-compose up -d_ from './fabric-explorer' dir => To start the explorer containers.

   - To stop or down (to remove) container then run same docker-compose command with stop or down command.

7. Now open the explorer dashboard in browser on _port - 8080_.
