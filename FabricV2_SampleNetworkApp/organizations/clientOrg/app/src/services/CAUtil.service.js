"use strict";

const adminUserId = process.env.CA_ADMIN_USERID;
const adminUserPassword = process.env.CA_ADMIN_USER_PASSWORD;

/**
 *
 * @param {*} FabricCAServices
 * @param {*} ccp
 */
const buildCAClient = (FabricCAServices, ccp, caHostName) => {
  // Create a new CA client for interacting with the CA.
  const caInfo = ccp.certificateAuthorities[caHostName]; //lookup CA details from config
  const caTLSCACerts = caInfo.tlsCACerts.pem;
  // const caClient = new FabricCAServices(
  //   caInfo.url,
  //   { trustedRoots: caTLSCACerts, verify: true },
  //   caInfo.caName
  // );
  const caClient = new FabricCAServices(caInfo.url);

  console.log(`Built a CA Client named ${caInfo.caName}`);
  return caClient;
};

const enrollAdmin = async (caClient, wallet, orgMspId) => {
  try {
    // Check to see if we've already enrolled the admin user.
    const identity = await wallet.get(adminUserId);
    if (identity) {
      console.log(
        "An identity for the admin user already exists in the wallet"
      );
      return;
    }

    console.log("Admin Identity not found... Enroll admin");
    // Enroll the admin user, and import the new identity into the wallet.
    const enrollment = await caClient.enroll({
      enrollmentID: adminUserId,
      enrollmentSecret: adminUserPassword,
    });
    console.log(`adminEnrollment - ${enrollment}`);
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgMspId,
      type: "X.509",
    };

    console.log("x509Id", x509Identity);
    console.log("putting into wallet");
    await wallet.put(adminUserId, x509Identity);
    console.log(
      "Successfully enrolled admin user and imported it into the wallet"
    );
  } catch (error) {
    console.error(`Failed to enroll admin user : ${error}`);
  }
};

const registerAndEnrollUser = async (
  caClient,
  wallet,
  orgMspId,
  userId,
  affiliation
) => {
  try {
    // Check to see if we've already enrolled the user
    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      console.log(
        `An identity for the user ${userId} already exists in the wallet`
      );
      return;
    }

    // Must use an admin to register a new user
    console.log("User Identity not found... Enroll user");
    const adminIdentity = await wallet.get(adminUserId);
    if (!adminIdentity) {
      console.log(
        "An identity for the admin user does not exist in the wallet"
      );
      console.log("Enroll the admin user before retrying");
      return;
    }

    // build a user object for authenticating with the CA
    const provider = wallet
      .getProviderRegistry()
      .getProvider(adminIdentity.type);

    const adminUser = await provider.getUserContext(adminIdentity, adminUserId);

    // Register the user, enroll the user, and import the new identity into the wallet.
    // if affiliation is specified by client, the affiliation value must be configured in CA
    const secret = await caClient.register(
      {
        affiliation: affiliation,
        enrollmentID: userId,
        role: "client",
      },
      adminUser
    );

    const enrollment = await caClient.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret,
    });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgMspId,
      type: "X.509",
    };
    await wallet.put(userId, x509Identity);
    console.log(
      `Successfully registered and enrolled user ${userId} and imported it into the wallet`
    );
  } catch (error) {
    console.error(`Failed to register user : ${error}`);
  }
};

const isUserExist = async (wallet, userId) => {
  console.log("userExist: wallet path", wallet);
  const identity = await wallet.get(userId);
  if (!identity) {
    throw new Error("Identity not exist ");
  }
  return true;
};

export { buildCAClient, enrollAdmin, registerAndEnrollUser, isUserExist };
