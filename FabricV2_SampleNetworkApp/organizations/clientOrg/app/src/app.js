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

// import new gRPC connection
import {
  initiateGRPC_Connection,
  close_GRPC_Connection,
} from "./utils/gRPCGatewayConnectionHandler.js";

const startServer = async () => {
  try {
    console.log("Fetching gRPC Gateway instance ...");
    const instance = await initiateGRPC_Connection();
    console.log("gRPC instance connection in app: " + instance);
    console.log("** gRPC Gateway instance created successfully **");
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
