"use strict";

import express from "express";
import cors from "cors";
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const port = process.env.PORT;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // to manage req origin source ex- origin: 'http://example.com'
    credentials: true, // allow cookies on cross-origin requests
  })
);

const org = process.env.ORG_MSP;
const userId = process.env.ORG_USER_ID;

import { registerUser } from "./services/userRegister.service.js";
import {
  initiateConnection,
  closeConnection,
} from "./utils/connectionHandler.js";

const register = async () => {
  console.log("Registering user if not registered");
  try {
    let result = await registerUser({ OrgMSP: org, userId: userId });
    console.log("USER CREATED : ", result);
    return result;
  } catch (error) {
    return error;
  }
};

// import utility functions for OffChain Sync Purpose
import { initiateNextBlockDocument, handleTxnBlockEvent } from "./utils/offChainTxnBlockHandler.js";

const startServer = async () => {
  try {
    await register();
    console.log("Checking Gateway Connection...");
    const instance = await initiateConnection();
    console.log("** Gateway Connection Established **");
    console.log("instance connection: " + instance);

    // use OffChain
    const allow_offchain = process.env.ALLOW_OFFCHAIN_SYNC.toLowerCase();
    console.log(`***---- Allow OffChain Data Sync: ${allow_offchain} ----***`);
    if(allow_offchain === "true") {
      // initializing OffChain
      // await initiateNextBlockFile();
      await initiateNextBlockDocument();
    }

    app.listen(port, () => {
      console.log(`Server is listening at port- ${port}`);
      console.log(`Swagger docs available at '/api-docs'`);
    });

    // for Offchain attaching block listener on channel network
    if(allow_offchain === "true") {
       // attach blockListener on all channels
      const channelName = process.env.CHANNEL_NAME;
      const network = await instance.getNetwork(channelName);
      // now handle block events for OffChain Data Sync
      await handleTxnBlockEvent(network);
    }
    
  } catch (error) {
    console.log(`Server Error: ${error}`);
  }
};

// import routes
import productRouter from "./routes/product.routes.js";

// Read the generated Swagger JSON file
const swaggerFilePath = path.join(__dirname, 'swagger-output.json');
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFilePath, 'utf8'));

// Mount application routes
app.use("/products", productRouter);

// Mount the Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// middleware to handle errors
import { ApiError } from "./utils/ApiError.js";
app.use((err, req, res, next) => {
  console.log(`--- In Error Handling Middleware ---`);
  // Check if it's your custom error
  console.error(err);
  if (err instanceof ApiError) {
    console.info("** ApiError Class error **");
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      success: err.success,
      message: err.message,
    });
  } else {
    // Handle other errors (e.g., server errors)
    console.info("** Critical Unknown Error **");
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: `Critical Error: ${err.message}`,
    });
  }
});

startServer();
