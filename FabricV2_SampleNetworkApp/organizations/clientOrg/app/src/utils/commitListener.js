// Color codes for console logging
const RED = "\x1b[31m\n";
const GREEN = "\x1b[32m\n";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

// monitor commit events for transactions
const commitListener = (err, event) => {
  if (err) {
    console.log(`${RED}-- Peer Communication Error in CommitEvents --${RESET}`);
    console.log(`${RED}-- Error:(CommitEvents Error) - ${err} --${RESET}`);
  } else {
    console.log(
      `${GREEN}**-- Endorser Peer -> Name: ${event.peer.name} --**${RESET}`
    );
    const contractEvents = event.getContractEvents();
    console.log(`Contract Events =  ${JSON.stringify(contractEvents)}`);
    const contractEvent = contractEvents[0];
    console.log(`Current Contract Event = ${JSON.stringify(contractEvent)}`);
    const txnEvent = contractEvent.getTransactionEvent();
    console.log(
      `***-- txnId: ${txnEvent.transactionId} txnStatus: ${txnEvent.status} --***`
    );
    console.log(`***-- Is txn Committed: ${txnEvent.isValid} --***`);
    const blockEvent = txnEvent.getBlockEvent();
    console.log(
      `${GREEN}***-- Block Number: ${blockEvent.blockNumber.toString()} --***${RESET}`
    );
  }
};

export { commitListener };
