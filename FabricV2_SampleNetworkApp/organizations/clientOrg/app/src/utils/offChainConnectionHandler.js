import { MongoClient } from 'mongodb';

/**
 * MongoDB connection helper
 */
const getMongoDBConnection = async() => {
    try {
        const mongo_URL = process.env.OFFCHAIN_MONGODB_ADDRESS;
        const client = new MongoClient(mongo_URL);
        // use connect method to connect to the server
        await client.connect();
        console.log("Connected successfully to server");
        return client;
    } catch(err) {
        console.error(`!! MongoDB connection failed: ${err.message}`);
        throw err;
    }    
}

export {getMongoDBConnection};