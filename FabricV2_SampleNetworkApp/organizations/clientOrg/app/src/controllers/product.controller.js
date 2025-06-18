"use strict";

import { initiateConnection } from "../utils/connectionHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { commitListener } from "../utils/commitListener.js";

// Color codes for console logging
const RED = "\x1b[31m\n";
const GREEN = "\x1b[32m\n";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

// Env variable to allow OffChain Data Sync
const allow_offchain = process.env.ALLOW_OFFCHAIN_SYNC.toLowerCase();

const addProduct = asyncHandler(async (req, res) => {
  console.log(`${BLUE}--- Controller: addProduct called ---${RESET}`);
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
    throw new ApiError(400, "Invalid value in request parameters!");
  }

  const orgMSP = process.env.Org1MSP;
  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  // variables declaration
  let network;
  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);

    // fetching endorsing peers
    const peers = network.getChannel().getEndorsers(orgMSP);
    // console.log(`Endorsing Peers : ${peers}`);

    console.log("-- Initiating Transaction... --");
    // create a transaction
    const transaction = contract.createTransaction("addProductData");
    // get transaction Id
    const DLT_txnId = transaction.getTransactionId();
    console.log(`DLT Txn Id - ${DLT_txnId}`);

    // attach commitListener - (listening on one random endorsing peers therefore using peers.slice(0,1))
    await network.addCommitListener(commitListener, peers.slice(0, 1), DLT_txnId);

    // Data payload
    const payload = [
      productNumber,
      productManufacturer,
      productName,
      productOwnerName,
    ];

    console.log(`Data Payload : ${payload}`);

    // now submit the transaction with required args
    const bufferResp = await transaction.submit(...payload);
    
    console.log(`${GREEN}** Transaction Committed **${RESET}`);
    console.log(`Buffer Response - ${bufferResp.toString()}`);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { DLT_txnId: DLT_txnId },
          "Product Added Successfully"
        )
      );
  } catch (error) {
    let errorMessage = extractMessage(error.message);
    if (errorMessage.includes("already exist!")) {
      throw new ApiError(400, errorMessage);
    }
    throw new ApiError(500, `Chaincode Error - ${error.message}`);
  } finally {
    network.removeCommitListener(commitListener);
    console.log(`${BLUE}-- Removed Commit Listener --${RESET}`);
    // this is not working currently
    // network.removeBlockListener(blockListener);
    // console.log(`${BLUE}-- Removed Block Listener --${RESET}`);
  }
});

const getProductById = asyncHandler(async (req, res) => {
  console.log(`${BLUE}--- Controller: getProductById called ---${RESET}`);
  const { productNumber } = req.body;
  if (!(productNumber && productNumber?.trim() !== "")) {
    throw new ApiError(400, "Invalid request parameters!");
  }
  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);

    console.log(`Data Fetch Payload - ${productNumber}`);

    let result = await contract.evaluateTransaction(
      "getProductData",
      productNumber
    );
    console.log(`${GREEN} -- getProductById Transaction Completed -- ${RESET}`);
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
  console.log(`${BLUE}--- Controller: deleteProductById called ---${RESET}`);
  const { productNumber } = req.params;
  if (!(productNumber && productNumber?.trim() !== "")) {
    throw new ApiError(400, "Invalid request parameters!");
  }

  const orgMSP = process.env.Org1MSP;
  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  // variables declaration
  let network;
  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);

    // fetching endorsing peers - (fetching only first 2 endorsing peers)
    const peers = network.getChannel().getEndorsers(orgMSP);
    // console.log(`Endorsing Peers : ${peers}`);

    console.log("-- Initiating Transaction.. --");

    // create a transaction
    const transaction = contract.createTransaction("deleteProduct");
    // get transaction Id
    const DLT_txnId = transaction.getTransactionId();
    console.log(`DLT Txn Id - ${DLT_txnId}`);

    // attach commitListener - (listening on one random endorsing peers therefore using peers.slice(0,1))
    await network.addCommitListener(commitListener, peers.slice(0, 1), DLT_txnId);

    console.log(`Data Payload : ${productNumber}`);

    // now submit the transaction with required args
    const bufferResp = await transaction.submit(productNumber);

    console.log(`${GREEN}** Transaction Committed **${RESET}`);
    console.log(`Buffer Response - ${bufferResp.toString()}`);
    console.log("**** Product Deleted ****");
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { DLT_txnId: DLT_txnId },
          "Product Deleted Successfully"
        )
      );
  } catch (error) {
    let errorMessage = extractMessage(error.message);
    if (errorMessage?.includes("does not exist!")) {
      throw new ApiError(400, errorMessage);
    }
    throw new ApiError(500, `Chaincode Error: ${error.message}`);
  } finally {
    network.removeCommitListener(commitListener);
    console.log(`${BLUE}-- Removed Commit Listener --${RESET}`);
  }
});

const updateProductOwner = asyncHandler(async (req, res) => {
  console.log(`${BLUE}--- Controller: updateProductOwner called ---${RESET}`);
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
    throw new ApiError(400, "Invalid value in request parameters!");
  }

  const orgMSP = process.env.Org1MSP;
  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  // variables declaration
  let network;
  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);

    // fetching endorsing peers - (fetching only first 2 endorsing peers)
    const peers = network.getChannel().getEndorsers(orgMSP);
    // console.log(`Endorsing Peers : ${peers}`);

    console.log("-- Initiating Transaction.. --");

    // create a transaction
    const transaction = contract.createTransaction("updateProductOwner");
    // get transaction Id
    const DLT_txnId = transaction.getTransactionId();
    console.log(`DLT Txn Id - ${DLT_txnId}`);

    // attach commitListener - (listening on one random endorsing peers therefore using peers.slice(0,1))
    await network.addCommitListener(commitListener, peers.slice(0, 1), DLT_txnId);

    // payload
    const payload = [productNumber, oldOwnerName, newOwnerName];

    console.log(`Data Payload - ${payload}`);

    // now submit the transaction with required args
    const bufferResp = await transaction.submit(...payload);

    console.log(`${GREEN}** Transaction Committed **${RESET}`);
    console.log(`Buffer Response - ${bufferResp.toString()}`);
    console.log("**** Product Asset Updated ****");
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { DLT_txnId: DLT_txnId },
          "Product's Owner Updated Successfully"
        )
      );
  } catch (error) {
    const errorMessage = extractMessage(error.message);
    if (
      errorMessage?.includes("does not exist!") ||
      errorMessage?.includes("owner name is not matching")
    ) {
      throw new ApiError(400, errorMessage);
    }
    throw new ApiError(500, `Chaincode Error: ${error.message}`);
  } finally {
    network.removeCommitListener(commitListener);
    console.log(`${BLUE}-- Removed Commit Listener --${RESET}`);
  }
});

// Controller to perform query on Product Owner in Product Asset data in global state
const queryOnProductOwner = asyncHandler(async (req, res) => {
  console.log(`${BLUE}--- Controller: queryOnProductOwner called ---${RESET}`);
  const { productOwnerName } = req.body;
  if (!(productOwnerName && productOwnerName?.trim() != "")) {
    throw new ApiError(400, "Invalid request parameters!");
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
    const contract = network.getContract(chaincodeName);

    console.log(`Data Fetch Query - ${selectorQueryString}`);

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
  console.log(`${BLUE}--- Controller: queryOnProductName called ---${RESET}`);
  const { productName } = req.body;
  if (!(productName && productName?.trim() != "")) {
    throw new ApiError(400, "Invalid request parameters!");
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
    const contract = network.getContract(chaincodeName);

    console.log(`Data Fetch Query - ${selectorQueryString}`);

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

// Controller to perform query on Product Owner with Pagination
const queryOnProductOwnerWithPagination = asyncHandler(async(req, res) => {
  console.log(`${BLUE}--- Controller: queryOnProductOwnerWithPagination called ---${RESET}`);
  const { productOwnerName, pageSize, bookmark } = req.body;
  console.log(`Req Params: ${productOwnerName}, ${pageSize}, ${bookmark}`);

  if (!(productOwnerName && productOwnerName?.trim() != "")) {
    throw new ApiError(400, "Invalid productOwnerName argument!");
  }
  // check pageSize is valid argument and then change pageSize to number
  let pageSizeCount;
  if (pageSize && pageSize > 0) {
    pageSizeCount = parseInt(pageSize) || 10;
  } else {
    throw new ApiError(400, "Invalid pageSize argument!");
  } 
  // check bookmark is valid argument
  if(typeof bookmark !== "string") {
    throw new ApiError(400, "Invalid bookmark argument!");
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
    const contract = network.getContract(chaincodeName);

    const queryPayload = [ selectorQueryString, pageSizeCount, bookmark ];
    console.log(`Data Fetch Query with Pagination - Query: ${selectorQueryString}, pageSize: ${pageSizeCount}, bookmark: ${bookmark}`);
    
    const result = await contract.evaluateTransaction(
      "queryProductDataByPagination", ...queryPayload
    );
    console.log(`-- Query with Pagination Completed --`);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          JSON.parse(result),
          "Product Paginated Query Data Fetched Successfully"
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(500, `Chaincode Error: ${error.message}`);
  }
});

// Controller to fetch history for a UUID key
const getTransactionHistory = asyncHandler(async (req, res) => {
  console.info(
    `${BLUE}--- Controller: getTransactionHistory called ---${RESET}`
  );
  const { txnId, channelName } = req.body;

  if (!(txnId && channelName)) {
    console.error(
      `${RED} Error in Controller - Invalid request parameters!${RESET}`
    );
    throw new ApiError(400, "Invalid request parameters!");
  }
  if ([txnId, channelName].some((field) => field?.trim() === "")) {
    console.error(
      `${RED} Error in Controller - Invalid value in request parameters!${RESET}`
    );
    throw new ApiError(400, "Invalid value in request parameters!");
  }

  const chaincodeName = process.env.CHAINCODE_NAME;

  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);

    console.log(`Data Txn History Fetch Key - ${txnId}`);

    console.info(`Data Fetch Payload - ${txnId}`);
    const result = await contract.evaluateTransaction(
      "getHistoryForKey",
      txnId
    );
    console.log(`-- Txn History Fetch Completed --`);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          JSON.parse(result),
          "Transaction History Fetched Successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, `Chaincode Error: ${error.message}`);
  }
});

// To extract error message from chaincode error stack and simplify error message for logging
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

// Controller to add Product with Composite Key
const addProductWithCompositeKey = asyncHandler(async (req, res) => {
  console.log(`${BLUE}--- Controller: addProductWithCompositeKey called ---${RESET}`);
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
    throw new ApiError(400, "Invalid value in request parameters!");
  }

  const orgMSP = process.env.Org1MSP;
  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  // variables declaration
  let network;
  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);

    // fetching endorsing peers
    const peers = network.getChannel().getEndorsers(orgMSP);
    // console.log(`Endorsing Peers : ${peers}`);

    console.log("-- Initiating Transaction... --");

    // create a transaction
    const transaction = contract.createTransaction("addProductDataWithCompositeKey");
    // get transaction Id
    const DLT_txnId = transaction.getTransactionId();
    console.log(`DLT Txn Id - ${DLT_txnId}`);

    // attach commitListener - (listening on one random endorsing peers therefore using peers.slice(0,1))
    await network.addCommitListener(commitListener, peers.slice(0, 1), DLT_txnId);

    // Data payload
    const payload = [
      productNumber,
      productManufacturer,
      productName,
      productOwnerName,
    ];

    console.log(`Data Payload : ${payload}`);

    // now submit the transaction with required args
    const bufferResp = await transaction.submit(...payload);

    console.log(`${GREEN}** Transaction Committed **${RESET}`);
    console.log(`Buffer Response - ${bufferResp.toString()}`);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { DLT_txnId: DLT_txnId },
      "Product with Composite Key Added Successfully"
        )
      );
  } catch (error) {
    let errorMessage = extractMessage(error.message);
    if (errorMessage.includes("already exist!")) {
      throw new ApiError(400, errorMessage);
    }
    throw new ApiError(500, `Chaincode Error - ${error.message}`);
  } finally {
    network.removeCommitListener(commitListener);
    console.log(`${BLUE}-- Removed Commit Listener --${RESET}`);
  }
});

// Controller to Query Data with Partial Composite Key
const queryOnProductWithPartialCompositeKey = asyncHandler(async (req, res) => {
  console.log(`${BLUE}--- Controller: queryOnProductWithPartialCompositeKey called ---${RESET}`);
  const { keyName, attributes} = req.body;

  if (!(keyName && keyName?.trim() != "")) {
    throw new ApiError(400, "Invalid request parameters!");
  }
  if (!(attributes && Array.isArray(attributes))) {
    throw new ApiError(400, "Invalid value in 'attributes' parameter!");
  }

  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);

    console.log(`Partial Composite Key Fetch Query - keyName: ${keyName}, attributes: ${attributes}`);
    const result = await contract.evaluateTransaction(
      "getProductDataByPartialCompositeKey",
      keyName,
      attributes
    );
    console.log(`-- Partial Composite Key Data Query Completed --`);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          JSON.parse(result),
          "Product Query Data on Partial Composite Key is Fetched Successfully"
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(500, `Chaincode Error: ${error.message}`);
  }
});

const queryOnProductByKeyRange = asyncHandler(async (req,res) => {
  console.log(`${BLUE}--- Controller: queryonProductByKeyRange called ---${RESET}`);
  const { startKey, endKey } = req.body;

  if (!(startKey && startKey?.trim() != "")) {
    throw new ApiError(400, "Invalid request parameters!");
  }
  if (!(endKey && endKey?.trim() != "")) {
    throw new ApiError(400, "Invalid request parameters!");
  }

  const channelName = process.env.CHANNEL_NAME;
  const chaincodeName = process.env.CHAINCODE_NAME;

  try {
    const instance = await initiateConnection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = await instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);

    console.log(`Query on Product by Key Range - startKey: ${startKey}, endKey: ${endKey}`);
    const result = await contract.evaluateTransaction(
      "getProductDataByRange",
      startKey,
      endKey
    );
    console.log(`-- Query on Product by Key Range Completed --`);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          JSON.parse(result),
          "Product Query Data on Key Range is Fetched Successfully"
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(500, `Chaincode Error: ${error.message}`);
  }
});


export {
  addProduct,
  getProductById,
  deleteProductById,
  updateProductOwner,
  queryOnProductOwner,
  queryOnProductName,
  queryOnProductOwnerWithPagination,
  getTransactionHistory,
  addProductWithCompositeKey,
  queryOnProductWithPartialCompositeKey,
  queryOnProductByKeyRange
};
