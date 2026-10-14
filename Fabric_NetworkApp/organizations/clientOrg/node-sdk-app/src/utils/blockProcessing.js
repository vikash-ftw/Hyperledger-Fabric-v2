'use strict';
import mongodbutil from "./mongodbutil.js";
import { getNextBlock, updateNextBlock } from "./offChainTxnBlockHandler.js";

const channelid = process.env.CHANNEL_NAME;

const processBlockEvent = async function (channelname, block, db) {
    // reject the block if the block number is not defined
    if (block.header.number === undefined) {
        throw new Error('Undefined block number');
    }

    const blockNumber = block.header.number;

    console.log(`------------------------------------------------`);
    console.log(`-- BLOCK NUMBER: ${blockNumber} --`);

    // reject if the data is not set
    if (block.data.data === undefined) {
        throw new Error('Data block is not defined');
    }

    const dataArray = block.data.data;

    // transaction filter for each transaction in dataArray
    const txSuccess = block.metadata.metadata[2];

    // counter for total txn in this batch
    let blockTxnCounter = 0;
    for (let dataItem in dataArray) {
        // reject if a timestamp is not set
        if (dataArray[dataItem].payload.header.channel_header.timestamp === undefined) {
            throw new Error('Transaction timestamp is not defined');
        }

        // tx may be rejected at commit stage by peers
        // only valid transactions (code=0) update the world state and off-chain db
        // filter through valid tx, refer below for list of error codes
        // https://github.com/hyperledger/fabric-sdk-node/blob/release-1.4/fabric-client/lib/protos/peer/transaction.proto
        if (txSuccess[dataItem] !== 0) {
            continue;
        }

        const timestamp = dataArray[dataItem].payload.header.channel_header.timestamp;
        const tx_id = dataArray[dataItem].payload.header.channel_header.tx_id;

        // continue to next tx if no actions are set
        if (dataArray[dataItem].payload.data.actions === undefined) {
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
            if (actions[actionItem].payload.chaincode_proposal_payload.input.chaincode_spec.chaincode_id.name === undefined) {
                throw new Error('Chaincode name is not defined');
            }

            const chaincodeID = actions[actionItem].payload.chaincode_proposal_payload.input.chaincode_spec.chaincode_id.name;

            // reject if there is no readwrite set
            if (actions[actionItem].payload.action.proposal_response_payload.extension.results.ns_rwset === undefined) {
                throw new Error('No readwrite set is defined');
            }

            const rwSet = actions[actionItem].payload.action.proposal_response_payload.extension.results.ns_rwset;
            
            for (let record in rwSet) {
                // ignore lscc events
                if (rwSet[record].namespace !== 'lscc') {
                    const writeObject = {};
                    writeObject.blocknumber = blockNumber;
                    writeObject.chaincodeid = chaincodeID;
                    writeObject.timestamp = timestamp;
                    writeObject.tx_id = tx_id;
                    writeObject.values = rwSet[record].rwset.writes;

                    try {
                        await writeValuesToMongoDB(db, channelname, writeObject);
                    } catch (error) {
                        console.error(`!! Error in processBlockEvent: ${error}`);
                        throw error;
                    }
                }
            }
        }
        // increment txn counter
        blockTxnCounter++;
    }
    // Total txns in this Block
    console.log("***********")
    console.log(`========= BLOCK ${blockNumber} : Total Txns Batched: ${blockTxnCounter} =========`)
    console.log("***********")
    return true;
};

async function writeValuesToMongoDB(db, channelname, writeObject) {
    try {
        // define the database for saving block events by key - this emulates world state
        const dbname = (channelname + '_' + writeObject.chaincodeid).toLowerCase();

        // set values to the array of values received
        const values = writeObject.values;

        // iterate over each value entry
        for (let sequence in values) {
            const keyvalue = values[sequence];

            // if the key is marked for deletion, remove it from MongoDB
            if (keyvalue.is_delete === true) {
                console.log(`**-- Sending to MongoDB Delete=> DLT txnID: ${writeObject.tx_id} Key:${keyvalue.key} --**`);
                await mongodbutil.deleteRecord(db, dbname, keyvalue.key);
            }
            // if the value is a valid JSON string, parse and insert/update it
            else if (isJSON(keyvalue.value)) {
                // creating OffChain data payload
                const myOffChainData = {
                    data: JSON.parse(keyvalue.value),
                    blockNumber: parseInt(writeObject.blocknumber,10),
                    txnId: writeObject.tx_id,
                    timestamp: writeObject.timestamp,
                }
                console.log(`**-- Sending to MongoDB Write=> DLT txnID: ${writeObject.tx_id} Key:${keyvalue.key} --**`);
                await mongodbutil.writeToMongoDB(db, dbname, keyvalue.key, myOffChainData);
            }
        }
    } catch (error) {
        console.error(`!! Failed to write values to MongoDB: ${error}`);
        throw error;
    }
    return true;
}

function isJSON(value) {
    try {
        JSON.parse(value);
    } catch (e) {
        console.error("**-- !! BLOCK DATA IS NOT VALID JSON --**");
        return false;
    }
    return true;
}

// Promise utility function to 
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const processPendingBlocks = async (ProcessingMap, connection, maxRetries = 2) => {
    console.log("-- Starting Processing Pending Blocks --");

    let attempt = 0;
    let waitingLogged = false;
    while(true) {
        await delay(500); // 500 ms polling delay

        // retrive block from block checkpoint
        let nextBlockNumber = await getNextBlock();
        // retrieve block from the map by block number
        let processBlock = ProcessingMap.get(nextBlockNumber);

        // if no block is available then wait for blocks to come
        if (processBlock === undefined) {
            if (!waitingLogged) {
                console.log(">> Waiting for next block...");
                waitingLogged = true;
            }
            await delay(2000); // 2 sec delay
            continue;
        }
        console.log(`-- Checking block: ${nextBlockNumber} | Found: ${!!processBlock} --`);
        waitingLogged = false;

        try {
            // process the block by calling processBlockEvent
            await processBlockEvent(channelid, processBlock, connection);
            // if successful, remove the block from the ProcessingMap
            ProcessingMap.remove(nextBlockNumber);
            // increment the next block number to the next block
            await updateNextBlock(nextBlockNumber);
        } catch (error) {
            console.log(`--!! Failed to process block: ${nextBlockNumber} Error message:${error.message} !!--`);
            // Again retry and increase attempt count
            attempt++;

            // if max retry count reached then throw error
            if(attempt == maxRetries) {
                throw error;
            }
        }
    }
};

export {processBlockEvent, processPendingBlocks };