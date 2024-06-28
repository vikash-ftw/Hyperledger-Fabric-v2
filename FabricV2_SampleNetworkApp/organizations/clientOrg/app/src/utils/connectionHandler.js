"use strict";

import { singletonConnection } from "../services/fabricGateway.service.js";

const initiateConnection = async () => {
  try {
    let instance1 = await singletonConnection.getConnection();
    let instance2 = await singletonConnection.getConnection();
    const isSingleton = instance1 === instance2 ? true : false;
    console.log(`is connection singleton : ${isSingleton}`);
    return instance1;
  } catch (error) {
    console.log("Some error while initiating instance1 connection!");
    throw new Error(error.message);
  }
};

export { initiateConnection };
