"use strict";

import FabricCAServices from "fabric-ca-client";
import { Wallets } from "fabric-network";
import { buildWallet } from "./AppUtil.service.js";
import {
  buildCAClient,
  registerAndEnrollUser,
  enrollAdmin,
  isUserExist,
} from "./CAUtil.service.js";
import { getCCP } from "./buildCCP.service.js";
import path from "path";
import { fileURLToPath } from "url";

// Convert the current module's URL to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let walletPath;
const orgDomain = process.env.ORG_DOMAIN_NAME;

const registerUser = async ({ OrgMSP, userId }) => {
  // extract org number
  let org = Number(OrgMSP.match(/\d/g).join(""));

  // defining users wallet path dir
  walletPath = path.join(__dirname, "../../identity/wallet");

  let ccp = getCCP(org);
  const caClient = buildCAClient(
    FabricCAServices,
    ccp,
    `ca.org${org}.${orgDomain}`
  );

  // setup the wallet to hold the credentials of the admin user
  const wallet = await buildWallet(Wallets, walletPath);

  console.log("wallet: ", wallet);
  // in a real application this would be done on an administrative flow, and only once
  await enrollAdmin(caClient, wallet, OrgMSP);

  // in a real application this would be done only when a new user was required to be added
  // and would be part of an administrative flow
  await registerAndEnrollUser(
    caClient,
    wallet,
    OrgMSP,
    userId,
    `org${org}.department1`
  );

  return { wallet };
};

const userExist = async ({ OrgMSP, userId }) => {
  let org = Number(OrgMSP.match(/\d/g).join(""));
  let ccp = getCCP(org);
  const caClient = buildCAClient(FabricCAServices, ccp, `ca-org${org}`);
  // setup the wallet to hold the credentials of the application user
  const wallet = await buildWallet(Wallets, walletPath);
  const result = await isUserExist(wallet, userId);
  return result;
};

export { registerUser, userExist };
