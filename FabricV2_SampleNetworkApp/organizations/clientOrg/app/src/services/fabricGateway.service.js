import {
  Wallets,
  Gateway,
  DefaultEventHandlerStrategies,
} from "fabric-network";
import { getCCP } from "./buildCCP.service.js";
import { buildWallet } from "./AppUtil.service.js";
import path from "path";
import { fileURLToPath } from "url";

// Convert the current module's URL to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const org = process.env.ORG_MSP;
const userId = process.env.ORG_USER_ID;

const walletPath = path.join(__dirname, "../../identity/wallet");

const singletonConnection = (function () {
  let instance = null;

  async function createConnection() {
    try {
      let num = Number(org.match(/\d/g).join(""));
      const ccp = getCCP(num);

      const wallet = await buildWallet(Wallets, walletPath);

      // // Gateway Options

      // // Defining Event Handling option - eventHandlerOptions
      // const connectOptions = {
      //   wallet,
      //   identity: userId,
      //   discovery: { enabled: true, asLocalhost: true },
      //   eventHandlerOptions: {
      //     strategy: DefaultEventHandlerStrategies.NETWORK_SCOPE_ALLFORTX,
      //   },
      // };

      // // Using default event Handling option if not specified explicitly
      const connectOptions = {
        wallet,
        identity: userId,
        discovery: { enabled: true, asLocalhost: true },
      };
      const gateway = new Gateway();

      await gateway.connect(ccp, connectOptions);

      console.log(
        "Gateway object created in fabricGateway.service.js",
        gateway
      );

      return gateway;
    } catch (error) {
      throw new Error(`Failed to connect to the gateway: ${error.message}`);
    }
  }

  return {
    getConnection: async function () {
      if (!instance) {
        instance = createConnection();
      }

      return instance;
    },
    closeConnection: async function () {
      try {
        const gatewayInstance = await instance;
        if (gatewayInstance && gatewayInstance instanceof Gateway) {
          console.log("Closing Gateway connection...");
          gatewayInstance.disconnect();
          instance = null;
          console.log("Gateway Connection Closed !");
        } else {
          console.log("Invalid Gateway Instance!!");
        }
      } catch (error) {
        console.log(`Error closing the gateway connection: ${error.message}`);
      }
    },
  };
})();

export { singletonConnection };
