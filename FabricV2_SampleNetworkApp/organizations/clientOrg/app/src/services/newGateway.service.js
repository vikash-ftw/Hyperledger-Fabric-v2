"use strict";

import grpc from "@grpc/grpc-js";
import { connect, signers } from "@hyperledger/fabric-gateway";
import crypto from "crypto";
import * as fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Convert the current module's URL to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * envOrDefault() will return the value of an environment variable, or a default value if the variable is undefined.
 */
function envOrDefault(key, defaultValue) {
  return process.env[key] || defaultValue;
}

const mspId = envOrDefault("MSP_ID", "Org1MSP");

// Path to crypto materials
const cryptoPath = envOrDefault(
  "CRYPTO_PATH",
  path.resolve(__dirname, "../../../../peerOrganizations/org1.example.com")
);

// Path to user private key dir
const keyDirectoryPath = envOrDefault(
  "KEY_DIRECTORY_PATH",
  path.resolve(cryptoPath, "users/User1@org1.example.com/msp/keystore")
);

// Path to user certificate directory
const certDirectoryPath = envOrDefault(
  "CERT_DIRECTORY_PATH",
  path.resolve(cryptoPath, "users/User1@org1.example.com/msp/signcerts")
);

// using peer0 with gateway

// Path to peer0 tls certificate
const tlsCertPath = envOrDefault(
  "TLS_CERT_PATH",
  path.resolve(cryptoPath, "peers/peer0.org1.example.com/tls/ca.crt")
);

// Gateway peer0 endpoint
const peerEndpoint = envOrDefault("PEER_ENDPOINT", "localhost:7051");

// Gateway peer SSL host name override
const peerHostAlias = envOrDefault("PEER_HOST_ALIAS", "peer0.org1.example.com");

const gRPC_SingletonConnection = (function () {
  // gateway instance
  let instance = null;

  async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
      "grpc.ssl_target_name_override": peerHostAlias,
    });
  }

  async function getFirstDirFileName(dirPath) {
    const files = await fs.readdir(dirPath);
    const file = files[0];
    if (!file) {
      throw new Error(`No files in directory: ${dirPath}`);
    }
    return path.join(dirPath, file);
  }

  async function newIdentity() {
    const certPath = await getFirstDirFileName(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
  }

  async function newSigner() {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
  }

  async function createConnection() {
    const client = await newGrpcConnection();
    const connectOptions = {
      client,
      identity: await newIdentity(),
      signer: await newSigner(),
      // Default timeouts for different gRPC calls
      evaluateOptions: () => {
        return { deadline: Date.now() + 5000 }; // 5 seconds
      },
      endorseOptions: () => {
        return { deadline: Date.now() + 15000 }; // 15 seconds
      },
      submitOptions: () => {
        return { deadline: Date.now() + 5000 }; // 5 seconds
      },
      commitStatusOptions: () => {
        return { deadline: Date.now() + 60000 }; // 1 minute
      },
    };

    try {
      const gateway = connect(connectOptions);
      console.log("gRPC gateway is created with peer0 - ", gateway);
      return gateway;
    } catch (error) {
      throw new Error(`Failed to create gRPC gateway: ${error.message}`);
    }
  }

  return {
    getConnection: function () {
      if (!instance) {
        instance = createConnection();
      }

      return instance;
    },
  };
})();

export { gRPC_SingletonConnection };
