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

const startServer = async () => {
  try {
    const user = await register();
    console.log("User created or not : ", user);
    console.log("Checking Gateway Connection...");
    const instance = await initiateConnection();
    console.log("** Gateway Connection Established **");
    console.log("instance connection: " + instance);
    app.listen(port, () => {
      console.log(`Server is listening at port- ${port}`);
    });
  } catch (error) {
    console.log(`Server Error: ${error}`);
  }
};

// import routes
import productRouter from "./routes/product.routes.js";

app.use("/products", productRouter);

startServer();
