"use strict";

import { initiateGRPC_Connection } from "../utils/gRPCGatewayConnectionHandler.js";
import { CommitError, GatewayError } from "@hyperledger/fabric-gateway";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { TextDecoder } from "util";

const utf8Decoder = new TextDecoder();

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
    const instance = await initiateGRPC_Connection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);
    console.log("-- Initiating Transaction... --");
    // create a proposal
    const proposal = contract.newProposal("addProductData", {
      arguments: [
        productNumber,
        productManufacturer,
        productName,
        productOwnerName,
      ],
    });
    // now endorse the proposal
    const transaction = await proposal.endorse();
    // fetch the transaction Id
    const txnId = transaction.getTransactionId();
    console.log(`Txn Id - ${txnId}`);
    // now submit the transaction
    const submittedTransaction = await transaction.submit();
    // fetch the commited transaction status
    const commitStatus = await submittedTransaction.getStatus();
    // Fetching all properties of commitStatus
    console.log(`Committed Block Number - ${commitStatus.blockNumber}`);
    console.log(`Commit StatusCode - ${commitStatus.code}`);
    console.log(`Commit Successful - ${commitStatus.successful}`);
    if (!commitStatus.successful) {
      console.log("--- Transaction Failed ---");
      throw new ApiError(400, "Transaction Failed!");
    }
    console.log("--- Transaction Commited ---");
    res
      .status(201)
      .json(new ApiResponse(201, {}, "Product Added Successfully"));
  } catch (error) {
    let errorMessage;
    if (error instanceof CommitError) {
      console.log("Chaincode Error: CommitError statusCode- ", error.code);
      throw new ApiError(
        500,
        `Chaincode Error of type CommitError with statusCode - ${error.code}`
      );
    }
    if (error instanceof GatewayError) {
      console.log("Chaincode Error: GatewayError statusCode- ", error.code);
      console.log("Error details address: ", error.details[0].address);
      console.log("Error details message: ", error.details[0].message);
      errorMessage = error.details[0].message;
      if (errorMessage.includes("already exist!")) {
        throw new ApiError(400, errorMessage);
      }
      throw new ApiError(500, errorMessage);
    }
    throw new ApiError(500, error.message);
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
    const instance = await initiateGRPC_Connection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);

    const result = await contract.evaluateTransaction(
      "getProductData",
      productNumber
    );
    const resultJson = utf8Decoder.decode(result);
    console.log(`-- getProductById Transaction Completed --`);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          JSON.parse(resultJson),
          "Product Fetched Successfully"
        )
      );
  } catch (error) {
    let errorMessage;
    if (error instanceof CommitError) {
      console.log("Chaincode Error: CommitError statusCode- ", error.code);
      throw new ApiError(
        500,
        `Chaincode Error of type CommitError with statusCode - ${error.code}`
      );
    }
    if (error instanceof GatewayError) {
      console.log("Chaincode Error: GatewayError statusCode- ", error.code);
      console.log("Error details address: ", error.details[0].address);
      console.log("Error details message: ", error.details[0].message);
      errorMessage = error.details[0].message;
      if (errorMessage.includes("does not exist!")) {
        throw new ApiError(400, errorMessage);
      }
      throw new ApiError(500, errorMessage);
    }
    throw new ApiError(500, error.message);
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
    const instance = await initiateGRPC_Connection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);
    console.log("-- Initiating Transaction... --");
    // create a proposal
    const proposal = contract.newProposal("deleteProduct", {
      arguments: [productNumber],
    });
    // now endorse the proposal
    const transaction = await proposal.endorse();
    // fetch the transaction Id
    const txnId = transaction.getTransactionId();
    console.log(`Txn Id - ${txnId}`);
    // now submit the transaction
    const submittedTransaction = await transaction.submit();
    // fetch the commited transaction status
    const commitStatus = await submittedTransaction.getStatus();
    // Fetching all properties of commitStatus
    console.log(`Committed Block Number - ${commitStatus.blockNumber}`);
    console.log(`Commit StatusCode - ${commitStatus.code}`);
    console.log(`Commit Successful - ${commitStatus.successful}`);
    if (!commitStatus.successful) {
      console.log("--- Transaction Failed ---");
      throw new ApiError(400, "Transaction Failed!");
    }
    console.log("--- Transaction Commited ---");
    res
      .status(200)
      .json(new ApiResponse(200, {}, "Product Deleted Successfully"));
  } catch (error) {
    let errorMessage;
    if (error instanceof CommitError) {
      console.log("Chaincode Error: CommitError statusCode- ", error.code);
      throw new ApiError(
        500,
        `Chaincode Error of type CommitError with statusCode - ${error.code}`
      );
    }
    if (error instanceof GatewayError) {
      console.log("Chaincode Error: GatewayError statusCode- ", error.code);
      console.log("Error details address: ", error.details[0].address);
      console.log("Error details message: ", error.details[0].message);
      errorMessage = error.details[0].message;
      if (errorMessage.includes("does not exist!")) {
        throw new ApiError(400, errorMessage);
      }
      throw new ApiError(500, errorMessage);
    }
    throw new ApiError(500, error.message);
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
    const instance = await initiateGRPC_Connection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);
    console.log("-- Initiating Transaction... --");
    // create a proposal
    const proposal = contract.newProposal("updateProductOwner", {
      arguments: [productNumber, oldOwnerName, newOwnerName],
    });
    // now endorse the proposal
    const transaction = await proposal.endorse();
    // fetch the transaction Id
    const txnId = transaction.getTransactionId();
    console.log(`Txn Id - ${txnId}`);
    // now submit the transaction
    const submittedTransaction = await transaction.submit();
    // fetch the commited transaction status
    const commitStatus = await submittedTransaction.getStatus();
    // Fetching all properties of commitStatus
    console.log(`Committed Block Number - ${commitStatus.blockNumber}`);
    console.log(`Commit StatusCode - ${commitStatus.code}`);
    console.log(`Commit Successful - ${commitStatus.successful}`);
    if (!commitStatus.successful) {
      console.log("--- Transaction Failed ---");
      throw new ApiError(400, "Transaction Failed!");
    }
    console.log("--- Transaction Commited ---");
    res
      .status(200)
      .json(new ApiResponse(200, {}, "Product's Owner Updated Successfully"));
  } catch (error) {
    let errorMessage;
    if (error instanceof CommitError) {
      console.log("Chaincode Error: CommitError statusCode- ", error.code);
      throw new ApiError(
        500,
        `Chaincode Error of type CommitError with statusCode - ${error.code}`
      );
    }
    if (error instanceof GatewayError) {
      console.log("Chaincode Error: GatewayError statusCode- ", error.code);
      console.log("Error details address: ", error.details[0].address);
      console.log("Error details message: ", error.details[0].message);
      errorMessage = error.details[0].message;
      if (
        errorMessage.includes("does not exist!") ||
        errorMessage.includes("owner name is not matching")
      ) {
        throw new ApiError(400, errorMessage);
      }
      throw new ApiError(500, errorMessage);
    }
    throw new ApiError(500, error.message);
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
    const instance = await initiateGRPC_Connection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);

    const result = await contract.evaluateTransaction(
      "queryProductData",
      selectorQueryString
    );
    const resultJson = utf8Decoder.decode(result);
    console.log(`-- Query Completed --`);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          JSON.parse(resultJson),
          "Product Query Data Fetched Successfully"
        )
      );
  } catch (error) {
    let errorMessage;
    if (error instanceof CommitError) {
      console.log("Chaincode Error: CommitError statusCode- ", error.code);
      throw new ApiError(
        500,
        `Chaincode Error of type CommitError with statusCode - ${error.code}`
      );
    }
    if (error instanceof GatewayError) {
      console.log("Chaincode Error: GatewayError statusCode- ", error.code);
      console.log("Error details address: ", error.details[0].address);
      console.log("Error details message: ", error.details[0].message);
      errorMessage = error.details[0].message;
      throw new ApiError(500, errorMessage);
    }
    throw new ApiError(500, error.message);
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
    const instance = await initiateGRPC_Connection();
    console.log(`-- Fetching Channel - ${channelName} --`);
    const network = instance.getNetwork(channelName);
    console.log(`-- Fetching Contract - ${chaincodeName} --`);
    const contract = network.getContract(chaincodeName);

    const result = await contract.evaluateTransaction(
      "queryProductData",
      selectorQueryString
    );
    const resultJson = utf8Decoder.decode(result);
    console.log(`-- Query Completed --`);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          JSON.parse(resultJson),
          "Product Query Data Fetched Successfully"
        )
      );
  } catch (error) {
    let errorMessage;
    if (error instanceof CommitError) {
      console.log("Chaincode Error: CommitError statusCode- ", error.code);
      throw new ApiError(
        500,
        `Chaincode Error of type CommitError with statusCode - ${error.code}`
      );
    }
    if (error instanceof GatewayError) {
      console.log("Chaincode Error: GatewayError statusCode- ", error.code);
      console.log("Error details address: ", error.details[0].address);
      console.log("Error details message: ", error.details[0].message);
      errorMessage = error.details[0].message;
      throw new ApiError(500, errorMessage);
    }
    throw new ApiError(500, error.message);
  }
});

export {
  addProduct,
  getProductById,
  deleteProductById,
  updateProductOwner,
  queryOnProductOwner,
  queryOnProductName,
};
