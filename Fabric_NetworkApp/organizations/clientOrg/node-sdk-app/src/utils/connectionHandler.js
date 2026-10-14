"use strict";

import { singletonConnection } from "../services/fabricGateway.service.js";

const initiateConnection = async () => {
  try {
    let instance = await singletonConnection.getConnection();
    // let instance2 = await singletonConnection.getConnection();
    // const isSingleton = instance1 === instance2 ? true : false;
    // console.log(`is connection singleton : ${isSingleton}`);
    return instance;
  } catch (error) {
    console.log("Some error while initiating instance connection!");
    throw new Error(error.message);
  }
};

const closeConnection = async () => {
  try {
    await singletonConnection.closeConnection();
  } catch (error) {
    console.log("Some error while closing instance connection!");
    throw new Error(error.message);
  }
};

export { initiateConnection, closeConnection };
