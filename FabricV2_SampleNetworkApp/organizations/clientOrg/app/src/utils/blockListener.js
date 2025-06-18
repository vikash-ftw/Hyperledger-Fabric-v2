import { ProcessingMap } from "./blockMap.js";

// Color codes for console logging
const RED = "\x1b[31m\n";
const GREEN = "\x1b[32m\n";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

// monitor commit events for transactions
const blockListener = async(event) => {
    console.log("--> In Block Listener <--");
    try {
        console.log(`${GREEN}***-- BlockListener:: Block Number: ${event.blockNumber.toString()} --***${RESET}`);

        // here event.blockNumber is of type object
        // so to process it safely we convert it to number type before storing it in ProcessingMap 
        ProcessingMap.set(parseInt(event.blockNumber.toString()), event.blockData);
        
        console.log(`${GREEN}***-- BlockListener:: Added block ${event.blockNumber} to ProcessingMap --***${RESET}`);
    } catch(err) {
        console.error(`${RED}-- BlockListener Error:(BlockEvents Error) - ${err} --${RESET}`);
        return;
    }
}

export { blockListener };
