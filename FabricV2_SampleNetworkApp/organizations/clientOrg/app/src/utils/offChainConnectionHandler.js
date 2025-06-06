import nano from 'nano';

const couchdb_address = process.env.COUCHDB_ADDRESS
const nanoServer = nano(couchdb_address);

export {nanoServer};