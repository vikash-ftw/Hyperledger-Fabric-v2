import { blockListener } from "./blockListener.js";

import path from "path";
import { fileURLToPath } from "url";

// Convert the current module's URL to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, '../../nextblock.txt');
import { nextBlock, processPendingBlocks } from "./blockProcessing.js";
import { ProcessingMap } from "./blockMap.js";
import { nanoServer } from "./offChainConnectionHandler.js";

// Color codes for console logging
const RED = "\x1b[31m\n";
const GREEN = "\x1b[32m\n";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

const handleTxnBlockEvent = async(network) => {
    try {
        // get offchaindb connection and check if its working
        const dbInfo = await nanoServer.info();
        // console.log(`dbInfo: ${JSON.stringify(dbInfo)}`);

        // if db connection successfull then only perform Block Event tasks
        if(dbInfo) {
            // attach blockListener - pass blockListener and set the starting block for the listener
            await network.addBlockListener(blockListener, {filtered: false, startBlock: parseInt(nextBlock, 10)});
            // now performing block processing
            console.log(`Listening for block events, nextblock: ${nextBlock}`);
            // start processing, looking for entries in the ProcessingMap
            await processPendingBlocks(configPath, ProcessingMap, nanoServer);
        }
        return;
    } catch (err) {
        console.log(`** -- Error in Block Events Listening for OffChain Sync: ${err} -- **`);
        console.log(`${RED}*** --> Currently OffChain is OUT OF SYNC <-- ***${RESET}`);
        return;
    }
}

export {handleTxnBlockEvent};