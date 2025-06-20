'use strict';

import { MongoClient } from 'mongodb';

// Singleton MongoDB client
let client = null;

/**
 * MongoDB connection helper
 */
export const initializeMongoDBConnection = async() => {
    if(client) {
        console.log("Provided Existing MongoDB Pool Connection Client")
        return client; // Already initialized
    }
    try {
        const mongo_URL = process.env.OFFCHAIN_MONGODB_ADDRESS;

        client = new MongoClient(mongo_URL);

        // use connect method to connect to the server
        await client.connect();
        console.log("Connected successfully to MongoDB server");
        return client;
    } catch(err) {
        console.error(`!! MongoDB connection failed: ${err.message}`);
        throw err;
    }    
}

export const getMongoDatabase = async(dbName) => {
    let mongoClient = await initializeMongoDBConnection();
    return mongoClient.db(dbName);
}

/**
 * Create a collection if it does not exist (MongoDB creates it automatically on insert).
 */
const createCollectionIfNotExists = async (db, collectionName) => {
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
        await db.createCollection(collectionName);
        console.log(`** Collection '${collectionName}' created **`);
        return true;
    }
    return false;
};

/**
 * Write or update a document in MongoDB.
 * If the key exists, it updates the document, otherwise inserts it.
 */
const writeToMongoDB = async (db, collectionName, key, value) => {
    try {
        await createCollectionIfNotExists(db, collectionName);

        const collection = db.collection(collectionName);
        if(!key) {
            throw new Error("Mongo Write Operation: No Key provided !!"); 
        }
        // Use upsert to insert or update the document
        await collection.updateOne(
            { _id: key },
            { $set: value },
            { upsert: true }
        );
        return true;
    } catch (err) {
        console.error(`!! writeToMongoDB error: ${err.message}`);
        throw err;
    }
};

/**
 * Delete a document by key from MongoDB.
 */
const deleteRecord = async (db, collectionName, key) => {
    try {
        await createCollectionIfNotExists(db, collectionName);

        const collection = db.collection(collectionName);

        const result = await collection.deleteOne({ _id: key });

        if (result.deletedCount === 0) {
            console.warn(`Document '${key}' not found, nothing to delete`);
            return false;
        }

        return true;
    } catch (err) {
        console.error(`!! mongodb deleteRecord error: ${err.message}`);
        throw err;
    }
};

/**
 * Fetch a document by key from MongoDB.
 */
const fetchOneRecord = async (db, collectionName, key) => {
    try {
        await createCollectionIfNotExists(db, collectionName);

        const collection = db.collection(collectionName);
        const result = await collection.findOne(key);
        return result;
    } catch(err) {
        console.error(`!! mongodb fetchOne error: ${err.message}`);
        throw err;
    }
}

export default {
    createCollectionIfNotExists,
    writeToMongoDB,
    deleteRecord,
    fetchOneRecord
};
