"use strict";

import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // to manage req origin source ex- origin: 'http://example.com'
    credentials: true, // allow cookies on cross-origin requests
  })
);

app.use(express.json());

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
    const user = await register();
    console.log("User created or not : ", user);
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

app.use("/products", productRouter);

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
