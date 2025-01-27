## ---- Steps to run Fabric v2.5 network ----

### **-- Fresh Setup on New Machine --**

- Check or Download the dependencies from here -> [Check_Dependencies_Doc](https://docs.google.com/document/d/1cF6vgNphqKYm4eFN2bJQcwKCz01P7u8SSJJ9oXDqGSs/edit?usp=sharing)

1. Make sure to remove files if any present under /var/hyperledger/ directory of your system.

2. Run _./loadFabricDependencies.sh_ -> to install all fabric binaries of specific version in your cloned project repo.

   - Check new folders created by running above script - bin, config and fabric-samples dir created.

3. Check ledger state related configs in 'FabricV2_SampleNetworkApp/docker/docker-compose-couch.yaml' file.
   - You can change CouchDB related configs in each _Peer_ defined for each _couchDB_ container. Just change environment values defined in _Peer_.
   - For more info follow this doc - [doc_link](https://hyperledger-fabric.readthedocs.io/en/release-2.2/couchdb_as_state_database.html)

> :memo: **Note:** We can generate crypto-materials via cryptogen(For testing and development purpose) or Fabric CA(For Production purpose) - We will use Fabric CA in our case.

> :memo: **Note:** From now on 'FabricV2_SampleNetworkApp' will be our project_home.

4. Run _./scripts/start_fabric-ca.sh_ from project_home dir -> to start fabric-ca containers needed for crypto-materials

   - Check new fabric ca containers will be up and running.
   - Also check fabric-ca (volume dir for fabric-ca containers) created under ./organizations

5. Run _./scripts/registerEnroll.sh_ from project_home -> to create crypto-materials for peers and orderers

   - Check out ordererOrganizations and peerOrganizations folders under ./organizations dir containing all crypto-materials related to peers and orderers.

6. Run _./organizations/ccp-generate.sh_ from project_home -> to create CCP(Common Connection Profile) files details under ./organizations/peerOrganizations dir

   - Check out ./organizations/peerOrganizations/org1.example.com/connection-org1.json and connection-org1.yaml files created by script

7. Run _./scripts/start_network.sh_ from project_home -> to create peers, orderers and couchDB and other containers

   - Check out new peers, orderers and couchDB containers up and running
   - Also check out /var/hyperledger/ folder (volume dir for all the created containers)
   - **Make sure none of the container goes in 'exit' state so wait for approx ~1min and then check containers**.

8. Run _./scripts/createChannel.sh_ from project_home -> to create a channel related files and join all peers on this channel

   - Check out ./channel-artifacts dir containing channel block file.

9. Run _./scripts/deploySmartContract.sh_ from project_home -> to package, install, approve, commit (New Lifecycle 4 step process) for chaincode
    - Check out ./fabricLedgerContract.tar.gz (packaged chaincode file)
    - Also check out new dev-peer docker containers up and running to handle chaincode invocation request
    - **Make sure none of the container goes in 'exit' state so wait for approx ~1min and then check containers.**

10. (For Testing Chaincode invocation) Run _./scripts/invokeContract.sh_ from project_home -> to check if chaincode is working via 'peer chaincode invoke' command.

    - Check if invoked transaction is committed or failed - if committed then chaincode is fine and ready to handle app request

11. Now go to './organizations/clientOrg/app' directory for all the application related work

    - Run _npm install_ (Node version must be v20.14)
    - Now Run _npm run start_ (start our node server)

12. Now our client app is ready to handle request and invoke chaincode -> Now test the controllers by hitting request to the server

### **-- Setup Hyperledger Explorer for Dashboard Monitoring --**

> :memo: **Note:** From now on 'fabric-explorer' directory under 'FabricV2_SampleNetworkApp' directory will be home for all the below mentioned changes.

1. Make sure the 'COMPOSE_PROJECT_NAME' variable in **.env** file under **./fabric-explorer** must have same value as of 'COMPOSE_PROJECT_NAME' variable in **.env** file under **./FabricV2_SampleNetworkApp**.

   - So that explorer containers can be created in same docker network in which fabric network is running.

2. The fabric's network full name to be mentioned in **config.json** file under 'network-configs' key attribute.

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

3. Now in **./docker-compose.yaml** file -- edit 'networks' just like you mentioned in your fabric's docker-compose network files. **So that explorer containers are created in same network as your fabric network**

4. Now go to the scripts directory in 'Project Home'.

   - To start explorer then run _./scripts/start_explorer.sh_
   - To stop explorer then run _./scripts/stop_explorer.sh_
   - To remove all explorer containers then run _./scripts/remove_explorer.sh_

5. Now open the explorer dashboard in browser on _port - 8080_.

6. If Explorer's service is not accessible on port 8080 -> Then there might be some issue so check the logs of fabric-explorer container.

   - It may be related to wrong docker network name. **So please check the fabric-explorer container logs**
   - Also after resolving the error, delete the volumes created by fabric explorer

     - These two volumes are:

       1. fabric_net_pgdata
       2. fabric_net_walletstore

     - So delete these two volumes by running 'docker volume rm' command available in docker. **(Only delete if you faced error in running Explorer service)**
     - Now recreate the explorer container as mentioned in step - 4.

**Please Star ⭐ This Repository.**