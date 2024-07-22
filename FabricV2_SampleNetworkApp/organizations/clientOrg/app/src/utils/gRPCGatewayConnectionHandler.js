"use strict";

import { gRPC_SingletonConnection } from "../services/newGateway.service.js";

const initiateGRPC_Connection = async () => {
  try {
    let instance = await gRPC_SingletonConnection.getConnection();
    // let instance2 = await gRPC_SingletonConnection.getConnection();
    // const isSingleton = instance1 === instance2 ? true : false;
    // console.log(`is gRPC gateway connection singleton : ${isSingleton}`);
    return instance;
  } catch (error) {
    console.log("Some error while initiating instance1 gRPC connection!");
    throw new Error(error.message);
  }
};

const close_GRPC_Connection = async () => {
  try {
    await gRPC_SingletonConnection.closeConnection();
  } catch (error) {
    console.log("Some error while closing grpc instance connection!");
    throw new Error(error.message);
  }
};

export { initiateGRPC_Connection, close_GRPC_Connection };
