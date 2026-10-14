import { blockListener } from "./blockListener.js";
import { processPendingBlocks } from "./blockProcessing.js";
import { ProcessingMap } from "./blockMap.js";
import mongodbutil, { getMongoDatabase } from "./mongodbutil.js";

// Color codes for console logging
const RED = "\x1b[31m\n";
const GREEN = "\x1b[32m\n";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

// MongoDB variables
let db; // Database connection instance variable
const nextBlockCollection = process.env.COUNTER_COLLECTION;
const mongoOffChainDatabaseName = process.env.OFFCHAIN_MONGODB_DATABASE;

const initiateNextBlockDocument = async() => {
    // defining DB name
    db = await getMongoDatabase(mongoOffChainDatabaseName);
    const flag = await mongodbutil.createCollectionIfNotExists(db, nextBlockCollection);
    if(flag) {
        await updateNextBlock(-1);
        console.log("Initialized the blockCounter with 0")
        return;
    }
    let nextBlock = await getNextBlock();
    console.log(`**-- Next Block to be Processed = ${nextBlock}`);
}

const getNextBlock = async() => {
    // fetch nextBlock from mongoDB collection
    const result = await mongodbutil.fetchOneRecord(db, nextBlockCollection, {_id: "block_checkpoint"});
    return result?.nextBlock;
}

const updateNextBlock = async(blockNumber) => {
    // updating next Block in mongoDB
    const filter = {_id: "block_checkpoint"};
    const options = { upsert: true};
    const updateDoc = {
        $set: {
           nextBlock: blockNumber + 1 
        },
    }
    await db.collection(nextBlockCollection).updateOne(filter, updateDoc, options);
    console.log(`**-- Updated Block Checkpoint to => ${blockNumber + 1}`);
}

const handleTxnBlockEvent = async(network) => {
    try {
        // if db connection successfull then only perform Block Event tasks
        if(db) {
            let nextBlock = await getNextBlock();
            const listenerOptions = { startBlock: nextBlock, type: 'full'}
            // now performing block processing
            console.log(`Listening for block events, nextblock: ${nextBlock}`);
            // attach blockListener - pass blockListener and set the starting block for the listener
            await network.addBlockListener(blockListener, listenerOptions);
            
            // a block is added in ProccesingMap by blockListener
            // start processing, looking for entries in the ProcessingMap
            // await processPendingBlocks(configPath, ProcessingMap, nanoServer);
            await processPendingBlocks(ProcessingMap, db);
        }
    } catch (err) {
        console.log(`** -- Error in Block Events Listening for OffChain Sync: ${err} -- **`);
        console.log(`${RED}*** --> Currently OffChain is OUT OF SYNC <-- ***${RESET}`);
    }
    return;
}

export {initiateNextBlockDocument, getNextBlock, updateNextBlock, handleTxnBlockEvent};