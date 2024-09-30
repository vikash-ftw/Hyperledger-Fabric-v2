## ---- Hyperledger Fabric 2.x versions list ----

- Check Hyperledger Fabric version 2.2 -> [v2.2](https://github.com/vikash-ftw/HyperledgerFabric-v2-setup/tree/main)

- Check Hyperledger Fabric version 2.5 (currently in development) -> [v2.5](https://github.com/vikash-ftw/HyperledgerFabric-v2-setup/tree/release-2.5)

## ---- Fabric Architecture Overview ----

[Architecture](https://github.com/vikash-ftw/HyperledgerFabric-v2-setup/issues/1)

## ---- Steps to run Fabric V2 network ----

### **-- Fresh Setup on New Machine --**

- Download or check the required dependencies from here -> [Dependencies](https://docs.google.com/document/d/1cF6vgNphqKYm4eFN2bJQcwKCz01P7u8SSJJ9oXDqGSs/edit?usp=sharing)

1. Make sure to remove 'hyperledger' directory (if present) under '/var' directory on your system.

2. Run _./loadFabricDependencies.sh_ -> to install all fabric binaries of specific version in your cloned project repo.

   - Check new folders created by above script -> bin, config and fabric-samples directory should be created.

3. (OPTIONAL - To tweak couchDB default configs) Check ledger state related configs in 'FabricV2_SampleNetworkApp/docker/docker-compose-couch.yaml' file.
   - You can change CouchDB related configs in each _Peer_ defined for each _couchDB_ container. Just change environment values defined in _Peer_.
   - For more info follow this doc - [doc_link](https://hyperledger-fabric.readthedocs.io/en/release-2.2/couchdb_as_state_database.html)

> :memo: **Note:** We can generate certificates and cryptographic key pairs (crypto-materials) that authenticate and authorize entities on the network via cryptogen (For testing and development purpose) or Fabric CA (For Production purpose) - We will use Fabric CA in our case.

> :memo: **Note:** From now on 'FabricV2_SampleNetworkApp' will be our project_home.

4. Run _./scripts/start_fabric-ca.sh_ from project_home -> to start fabric-ca containers needed for crypto-materials

   - Check new fabric ca containers will be up and running.
   - Also check fabric-ca (volume directory for fabric-ca containers) created under ./organizations

5. Run _./scripts/registerEnroll.sh_ from project_home -> to create crypto-materials for peers, orderers and other participating entities.

   - Check out ordererOrganizations and peerOrganizations folders under ./organizations directory containing all crypto-materials related to peers and orderers.

6. Run _./organizations/ccp-generate.sh_ from project_home -> to create CCP(Common Connection Profile) files details under ./organizations/peerOrganizations directory

   - Check out ./organizations/peerOrganizations/org1.example.com/connection-org1.json and connection-org1.yaml files created by script

7. Run _./createFirstGenesisBlock.sh_ from project_home -> to create genesis block of our network

   - Check out ./system-genesis-block folder created under project_home containing genesis.block file

8. Run _./scripts/start_network.sh_ from project_home -> to create and run our peers, orderers, couchDB and other network containers

   - Check out new peers, orderers, couchDB and other network containers up and running
   - Also check out /var/hyperledger/ folder (volume directory for all our peers, orderers and couchDB containers)
   - **Make sure none of the containers enters the 'Exited' state. Wait for approximately 20 seconds, then check the status of the containers.**

9. Run _./scripts/createChannel.sh_ from project_home -> to create a channel related files and join peers to this newly created channel

   - Check out ./channel-artifacts directory containing 3 files :- anchor and channel related .tx files and also .block file
   - **Make sure none of the containers enters the 'Exited' state. Wait for approximately 20 seconds, then check the status of the containers.**

10. Run _./scripts/deploySmartContract.sh_ from project_home -> to package, install, approve, commit (New Lifecycle 4 step process) for chaincode deployment

    - Check out ./fabricLedgerContract.tar.gz (packaged chaincode file) created on 'project_home' directory
    - Also check out new dev-peer containers up and running (chaincode containers) with their specific smartcontract version like 'v1', 'v2'. These containers will handle chaincode invocation requests
    - **Make sure none of the containers enters the 'Exited' state. Wait for approximately 20 seconds, then check the status of the containers.**

11. (OPTIONAL - For Testing Chaincode invocation) Run _./scripts/invokeContract.sh_ from project_home -> to check if chaincode is working via 'peer chaincode invoke' command

    - Check if invoked transaction is committed or failed - if successfully committed then chaincode is fine and ready to handle request made via application endpoint

12. Now go to './organizations/clientOrg/app' directory for all the application related task

    - Run _npm install_ (Node version must be v20.14)
    - Now Run _npm run start_ (start our node server)
    - If all goes well without any error while server start then check out -
    - Check out './organizations/clientOrg/app/identity' directory containing wallet identities for admin and user. (Generated identities for our client app)
    - Newly created user identity generated via fabric CA will now be used to invoke chaincode on our network.

13. Now our client app is ready to handle request and invoke chaincode -> Now test the controllers by hitting request to the server.

14. Some Dashboard URLs
    - CouchDB_Fauxton Dashboard URL -> http://\<IP>:5984/\_utils
    - Portainer URL -> http://\<IP>:9000

### **-- Setup Hyperledger Explorer for Dashboard Monitoring --**

> :memo: **Note:** From now on 'fabric-explorer' directory under 'FabricV2_SampleNetworkApp' directory will be home for all the below mentioned changes.

2. Make sure the 'COMPOSE_PROJECT_NAME' variable in **.env** file under **./fabric-explorer** must have same value as of 'COMPOSE_PROJECT_NAME' variable in **.env** file under **./FabricV2_SampleNetworkApp**.

   - So that explorer containers can be created in same docker network in which fabric network is running.

3. The fabric's network full name to be mentioned in **config.json** file under 'network-configs' key.

   - For example -

   ```
   {
      "network-configs": {
         "fabric_net_fbn": {
            "name": "Explorer Test Network",
            "profile": "./connection-profile/test-network.json"
         }
      },
      "license": "Apache-2.0"
   }
   ```

   - Under 'network-configs' -> "name" can be any name you want to give to your explorer dashboard like currently it is - "Explorer Test Network"

4. Now in **./docker-compose.yaml** file -- edit 'networks' just like you mentioned in your fabric's docker-compose network files. **So that explorer containers are created in same network as your fabric network**

5. Now go to the FabricV2_SampleNetworkApp directory.

   - To start explorer then run _./scripts/start_explorer.sh_
   - To stop explorer then run _./scripts/stop_explorer.sh_
   - To remove all explorer containers then run _./scripts/remove_explorer.sh_

6. Now open the Hyperledger Explorer dashboard on URL -> http://\<IP>:8080

7. If Explorer's service is not accessible on port 8080 -> Then there might be some issue so check the logs of fabric-explorer container.

   - It may be related to wrong docker network name. **So please check the fabric-explorer container logs**
   - Also after resolving the error, delete the volumes created by fabric explorer

     - These two volumes are:

       1. fabric_net_pgdata
       2. fabric_net_walletstore

     - So delete these two volumes by running 'docker volume rm' command available in docker.
     - Now recreate the explorer container as mentioned in step - 6.

## ---- Help Material ----

[Help](https://docs.google.com/document/d/1HPvIubGyVd9m5q4U-rwNbLDViEF10bpJAmBN9pycTvY/edit?usp=sharing)

Please Star ⭐ This Repository.
