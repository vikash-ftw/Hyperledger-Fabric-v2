'use strict';
import fs from "fs";
import couchdbutil from "./couchdbutil.js";

const channelid = process.env.CHANNEL_NAME;
const use_couchdb = process.env.USE_COUCHDB.toLowerCase();

// initialize the next block to be 0
let nextBlock = 0;

const processBlockEvent = async function (configPath, channelname, block, use_couchdb, nano) {

    return new Promise((async (resolve, reject) => {

        // reject the block if the block number is not defined
        if (block.header.number == undefined) {
            reject(new Error('Undefined block number'));
        }

        const blockNumber = block.header.number

        console.log(`------------------------------------------------`);
        console.log(`Block Number: ${blockNumber}`);

        // reject if the data is not set
        if (block.data.data == undefined) {
            reject(new Error('Data block is not defined'));
        }

        const dataArray = block.data.data;

        // transaction filter for each transaction in dataArray
        const txSuccess = block.metadata.metadata[2];

        for (let dataItem in dataArray) {

            // reject if a timestamp is not set
            if (dataArray[dataItem].payload.header.channel_header.timestamp == undefined) {
                reject(new Error('Transaction timestamp is not defined'));
            }

            // tx may be rejected at commit stage by peers
            // only valid transactions (code=0) update the word state and off-chain db
            // filter through valid tx, refer below for list of error codes
            // https://github.com/hyperledger/fabric-sdk-node/blob/release-1.4/fabric-client/lib/protos/peer/transaction.proto
            if (txSuccess[dataItem] !== 0) {
              continue;
            }

            const timestamp = dataArray[dataItem].payload.header.channel_header.timestamp;

            // continue to next tx if no actions are set
            if (dataArray[dataItem].payload.data.actions == undefined) {
                continue;
            }

            // actions are stored as an array. In Fabric 1.4.3 only one
            // action exists per tx so we may simply use actions[0]
            // in case Fabric adds support for multiple actions
            // a for loop is used for demonstration
            const actions = dataArray[dataItem].payload.data.actions;

            // iterate through all actions
            for (let actionItem in actions) {

                // reject if a chaincode id is not defined
                if (actions[actionItem].payload.chaincode_proposal_payload.input.chaincode_spec.chaincode_id.name == undefined) {
                    reject(new Error('Chaincode name is not defined'));
                }

                const chaincodeID = actions[actionItem].payload.chaincode_proposal_payload.input.chaincode_spec.chaincode_id.name

                // reject if there is no readwrite set
                if (actions[actionItem].payload.action.proposal_response_payload.extension.results.ns_rwset == undefined) {
                    reject(new Error('No readwrite set is defined'));
                }

                const rwSet = actions[actionItem].payload.action.proposal_response_payload.extension.results.ns_rwset

                for (let record in rwSet) {

                    // ignore lscc events
                    if (rwSet[record].namespace != 'lscc') {
                        // create object to store properties
                        const writeObject = new Object();
                        writeObject.blocknumber = blockNumber;
                        writeObject.chaincodeid = chaincodeID;
                        writeObject.timestamp = timestamp;
                        writeObject.values = rwSet[record].rwset.writes;

                        console.log(`Transaction Timestamp: ${writeObject.timestamp}`);
                        console.log(`ChaincodeID: ${writeObject.chaincodeid}`);
                        console.log(writeObject.values);

                        // const logfilePath = path.resolve(__dirname, 'nextblock.txt');

                        // send the object to a log file (uncomment to write output to log file)
                        // fs.appendFileSync(channelname + '_' + chaincodeID + '.log', JSON.stringify(writeObject) + "\n");

                        // if couchdb is configured, then write to couchdb
                        if (use_couchdb === "true") {
                            try {
                                await writeValuesToCouchDBP(nano, channelname, writeObject);
                            } catch (error) {

                            }
                        }
                    }
                };
            };
        };

        // update the nextblock.txt file to retrieve the next block
        fs.writeFileSync(configPath, (parseInt(blockNumber, 10) + 1).toString(10));

        resolve(true);

    }));
}

async function writeValuesToCouchDBP(nano, channelname, writeObject) {

    return new Promise((async (resolve, reject) => {

        try {

            // define the database for saving block events by key - this emulates world state
            const dbname = (channelname + '_' + writeObject.chaincodeid).toLowerCase();
            // define the database for saving all block events - this emulates history
            const historydbname = (channelname + '_' + writeObject.chaincodeid + '_history').toLowerCase();
            // set values to the array of values received
            const values = writeObject.values;

            try {
                for (let sequence in values) {
                    let keyvalue =
                        values[
                        sequence
                        ];

                    if (
                        keyvalue.is_delete ==
                        true
                    ) {
                        await couchdbutil.deleteRecord(
                            nano,
                            dbname,
                            keyvalue.key
                        );
                    } else {
                        if (
                            isJSON(
                                keyvalue.value
                            )
                        ) {
                            //  insert or update value by key - this emulates world state behavior
                            await couchdbutil.writeToCouchDB(
                                nano,
                                dbname,
                                keyvalue.key,
                                JSON.parse(
                                    keyvalue.value
                                )
                            );
                        }
                    }

                    // add additional fields for history
                    keyvalue.timestamp =
                        writeObject.timestamp;
                    keyvalue.blocknumber = parseInt(
                        writeObject.blocknumber,
                        10
                    );
                    keyvalue.sequence = parseInt(
                        sequence,
                        10
                    );

                    await couchdbutil.writeToCouchDB(
                        nano,
                        historydbname,
                        null,
                        keyvalue
                    );
                }
            } catch (error) {
                console.log(error);
                reject(error);
            }

        } catch (error) {
            console.error(`Failed to write to couchdb: ${error}`);
            reject(error);
        }

        resolve(true);

    }));

}

function isJSON(value) {
    try {
        JSON.parse(value);
    } catch (e) {
        console.log(" ***--- VALUE IS NOT JSON ---*** ");
        return false;
    }
    return true;
}

const initializeBlock = async(configPath) => {
    console.log("-- In initializeBlock function --");
    try {
        // check to see if there is a next block already defined
        if(fs.existsSync(configPath)) {
            // read file containing the next block to read
            nextBlock = fs.readFileSync(configPath, 'utf8');
        } else {            
            // store the next block as 0
            fs.writeFileSync(configPath, nextBlock.toString(10));
        }
    }
    catch(error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        process.exit(1);
    }
}

const processPendingBlocks = async(configPath, ProcessingMap, connection) => {
    console.log("-- Processing Pending Blocks --");
    setTimeout(async() => {
        // get the next block number from nextblock.txt
        let nextBlockNumber = fs.readFileSync(configPath, 'utf8');
        let processBlock;
        console.log(`-- nextBlockNumber: ${nextBlockNumber} --`);
        do {
            // get the next block number from nextblock.txt
            processBlock = ProcessingMap.get(nextBlockNumber)
            console.log(`-- processBlock: ${processBlock} --`);
            
            if (processBlock == undefined) {
                console.log("--> Executing Break Condition of Processing Pending Blocks <--");
                break;
            }

            try {
                await processBlockEvent(configPath, channelid, processBlock, use_couchdb, connection)
            } catch (error) {
                console.error(`Failed to process block: ${error}`);
            }
            // if successful, remove the block from the ProcessingMap
            ProcessingMap.remove(nextBlockNumber);

            // increment the next block number to the next block
            fs.writeFileSync(configPath, (parseInt(nextBlockNumber, 10) + 1).toString(10));

            // retrive the next block number to process
            nextBlockNumber = fs.readFileSync(configPath, 'utf8');
        } while (true);
    }, 250);
}

export {nextBlock, processBlockEvent, initializeBlock, processPendingBlocks};