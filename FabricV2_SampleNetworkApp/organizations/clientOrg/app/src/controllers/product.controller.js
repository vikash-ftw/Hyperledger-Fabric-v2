"use strict";

import { initiateConnection } from "../utils/connectionHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const addProduct = asyncHandler(async (req, res) => {
  console.log("--- Controller: addProduct called ---");
  const { productNumber, productManufacturer, productName, productOwnerName } =
    req.body;

  if (
    !(productNumber && productManufacturer && productName && productOwnerName)
  ) {
    throw new ApiError(400, "Invalid request parameters!");
  }

  if (
    [productNumber, productManufacturer, productName, productOwnerName].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "Some empty spaces in request parameters!");
  }

  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = await network.getContract(chaincodeName);
    console.log("-- Initiating Transaction.. --");
    const result = await contract.submitTransaction(
      "addProductDataOnChain",
      productNumber,
      productManufacturer,
      productName,
      productOwnerName
    );
    console.log("** Transaction Committed: ", result.toString());
    res
      .status(200)
      .json(new ApiResponse(200, {}, "Product Added Successfully"));
  } catch (error) {
    const errorMessage = extractMessage(error.message);
    if (errorMessage.includes("already exist!")) {
      throw new ApiError(400, errorMessage);
    }
    throw new ApiError(500, `Chaincode Error: ${error.message}`);
  }
});

const getProductById = asyncHandler(async (req, res) => {
  console.log("--- Controller: getProductById called ---");
  const { productNumber } = req.body;
  if (!(productNumber && productNumber?.trim() !== "")) {
    throw new ApiError(400, "Invalid productNumber!");
  }
  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = await network.getContract(chaincodeName);
    console.log("-- Initiating Transaction.. --");
    let result = await contract.evaluateTransaction(
      "getProductData",
      productNumber
    );
    console.log(`-- getProductById Transaction Completed --`);
    res
      .status(200)
      .json(
        new ApiResponse(200, JSON.parse(result), "Product Fetched Successfully")
      );
  } catch (error) {
    if (error.message?.includes("does not exist!")) {
      throw new ApiError(400, error.message);
    }
    throw new ApiError(500, `Chaincode Error: ${error.message}`);
  }
});

const deleteProductById = asyncHandler(async (req, res) => {
  console.log("--- Controller: deleteProductById called ---");
  const { productNumber } = req.params;
  if (!(productNumber && productNumber?.trim() !== "")) {
    throw new ApiError(400, "Invalid productNumber!");
  }

  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = await network.getContract(chaincodeName);
    console.log("-- Initiating Transaction.. --");
    const result = await contract.submitTransaction(
      "deleteProduct",
      productNumber
    );
    console.log("** Transaction Committed: ", result.toString());
    res
      .status(200)
      .json(new ApiResponse(200, {}, "Product Deleted Successfully"));
  } catch (error) {
    const errorMessage = extractMessage(error.message);
    if (errorMessage?.includes("does not exist!")) {
      throw new ApiError(400, errorMessage);
    }
    throw new ApiError(500, `Chaincode Error: ${error.message}`);
  }
});

const updateProductOwner = asyncHandler(async (req, res) => {
  console.log("--- Controller: updateProductOwner called ---");
  const { productNumber } = req.params;
  const { oldOwnerName, newOwnerName } = req.body;
  if (!(productNumber && oldOwnerName && newOwnerName)) {
    throw new ApiError(400, "Invalid request parameters!");
  }
  if (
    [productNumber, oldOwnerName, newOwnerName].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "Invalid empty spaces in req parameters!");
  }

  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = await network.getContract(chaincodeName);
    console.log("-- Initiating Transaction.. --");
    const result = await contract.submitTransaction(
      "updateProductOwner",
      productNumber,
      oldOwnerName,
      newOwnerName
    );
    console.log("** Transaction Committed: ", result.toString());
    res
      .status(200)
      .json(new ApiResponse(200, {}, "Product's Owner Updated Successfully"));
  } catch (error) {
    const errorMessage = extractMessage(error.message);
    if (
      errorMessage?.includes("does not exist!") ||
      errorMessage?.includes("owner name is not matching")
    ) {
      throw new ApiError(400, errorMessage);
    }
    throw new ApiError(500, `Chaincode Error: ${error.message}`);
  }
});

// Controller to perform query on Product Owner in Product Asset data in global state
const queryOnProductOwner = asyncHandler(async (req, res) => {
  console.log("--- Controller: queryOnProductOwner called ---");
  const { productOwnerName } = req.body;
  if (!(productOwnerName && productOwnerName?.trim() != "")) {
    throw new ApiError(400, "Invalid request parameter!");
  }

  // creating the selectorQueryString object required by chaincode
  const selectorQuery = { productOwnerName };
  if (typeof selectorQuery != "object" || Array.isArray(selectorQuery)) {
    throw new ApiError(500, "selectorQuery parameter is not a valid JSON!");
  }
  const selectorQueryString = JSON.stringify(selectorQuery);

  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = await network.getContract(chaincodeName);
    console.log("-- Initiating Transaction.. --");
    const result = await contract.evaluateTransaction(
      "queryProductData",
      selectorQueryString
    );
    console.log(`-- Query Completed --`);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          JSON.parse(result),
          "Product Query Data Fetched Successfully"
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(500, `Chaincode Error: ${error.message}`);
  }
});

// Controller to perform query on Product Name in Product Asset data in global state
const queryOnProductName = asyncHandler(async (req, res) => {
  console.log("--- Controller: queryOnProductName called ---");
  const { productName } = req.body;
  if (!(productName && productName?.trim() != "")) {
    throw new ApiError(400, "Invalid request parameter!");
  }

  // creating the selectorQueryString object required by chaincode
  const selectorQuery = { productName };
  if (typeof selectorQuery != "object" || Array.isArray(selectorQuery)) {
    throw new ApiError(500, "selectorQuery parameter is not a valid JSON!");
  }
  const selectorQueryString = JSON.stringify(selectorQuery);

  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = await network.getContract(chaincodeName);
    console.log("-- Initiating Transaction.. --");
    const result = await contract.evaluateTransaction(
      "queryProductData",
      selectorQueryString
    );
    console.log(`-- Query Completed --`);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          JSON.parse(result),
          "Product Query Data Fetched Successfully"
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(500, `Chaincode Error: ${error.message}`);
  }
});

// To extract error message from chaincode error stack
function extractMessage(errorString) {
  const messageKey = "message=";
  const messageStart = errorString.indexOf(messageKey);
  if (messageStart === -1) {
    return "No message found";
  }
  // Start just after 'message='
  const messageStartIndex = messageStart + messageKey.length;
  // Extract everything after 'message=' till the end of the line or string
  const messageEndIndex = errorString.indexOf("\n", messageStartIndex);
  const message =
    messageEndIndex === -1
      ? errorString.slice(messageStartIndex).trim()
      : errorString.slice(messageStartIndex, messageEndIndex).trim();
  return message;
}

export {
  addProduct,
  getProductById,
  deleteProductById,
  updateProductOwner,
  queryOnProductOwner,
  queryOnProductName,
};
