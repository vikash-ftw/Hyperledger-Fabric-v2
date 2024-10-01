/**
 * A Fabric Ledger Smart Contract in JS
 *
 * Author - Vikash Batham
 *
 */

"use strict";
// Fabric smart contract handler class
const { Contract } = require("fabric-contract-api");

/**
 *
 * Define FabricLedger smart contract by extending Fabric Contract class
 *
 */
class FabricLedgerContract extends Contract {
  async InitLedger(ctx) {
    console.info("--- Ledger initialized ---");
  }

  // Check if asset exist with given ID - return true(boolean) if exists
  async assetExists(ctx, id) {
    const assetJson = await ctx.stub.getState(id);
    return assetJson && assetJson.length > 0;
  }

  /**
   * Create product
   *
   * @param {Context} ctx the transaction context
   * @param {String} productNumber unique identifier for this product
   * @param {String} productManufacturer
   * @param {String} productName
   * @param {String} productOwnerName name of the owner to which it belongs
   */

  // Create An Asset
  async addProductData(
    ctx,
    productNumber,
    productManufacturer,
    productName,
    productOwnerName
  ) {
    console.info("============= START : addProductData =============");
    // check if asset already exist
    const exists = await this.assetExists(ctx, productNumber);
    if (exists) {
      throw new Error(`The product with id - ${productNumber} already exist!`);
    }
    const timestamp = new Date().toISOString();
    const product = {
      productNumber,
      productManufacturer,
      productName,
      productOwnerName,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // JSON obj stringify
    const assetJSON = JSON.stringify(product);
    console.info(`--- asset : ${assetJSON} ---`);
    // create Buffer
    const assetBuffer = Buffer.from(assetJSON);
    // add event
    ctx.stub.setEvent("addProductEvent", assetBuffer);
    // perform txn
    await ctx.stub.putState(productNumber, assetBuffer);
    console.info("-- Performed Context Txn --");
    return assetJSON;
  }

  // Fetch an Asset
  async getProductData(ctx, productNumber) {
    console.info(
      "============= START: Get ProductData by productNumber ============="
    );
    // fetching data from global state
    const assetJSON = await ctx.stub.getState(productNumber);
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`The product with id - ${productNumber} does not exist!`);
    }

    return assetJSON.toString();
  }

  // Asset Transfer Scenario (Update Asset)
  async updateProductOwner(ctx, productNumber, oldOwnerName, newOwnerName) {
    console.info("============= START: update Product's Owner =============");
    // calling getProductData to fetch the asset
    const assetString = await this.getProductData(ctx, productNumber);
    const assetJSON = JSON.parse(assetString);
    if (assetJSON.productOwnerName !== oldOwnerName) {
      throw new Error(
        `Product's current owner name is not matching with given owner name - ${oldOwnerName}`
      );
    }
    const timestamp = new Date().toISOString();
    assetJSON.productOwnerName = newOwnerName;
    assetJSON.updatedAt = timestamp;
    // create Buffer
    const assetBuffer = Buffer.from(JSON.stringify(assetJSON));
    // add event
    ctx.stub.setEvent("updateProductEvent", assetBuffer);
    await ctx.stub.putState(productNumber, assetBuffer);
    console.info("-- Performed Context Txn for update --");
    return assetJSON;
  }

  // Delete an asset
  async deleteProduct(ctx, productNumber) {
    console.info("============= START: Delete Product Asset =============");
    // check if asset exist or not
    const exists = await this.assetExists(ctx, productNumber);
    if (!exists) {
      throw new Error(`The product with id - ${productNumber} does not exist!`);
    }
    // add event
    ctx.stub.setEvent("deleteProductEvent", Buffer.from(productNumber));
    await ctx.stub.deleteState(productNumber);
    console.info("-- Performed Context Txn for delete --");
    return productNumber;
  }

  // Fetch an asset by Rich-Query (only supported in couchDB)
  async queryProductData(ctx, selectorQueryString) {
    console.info(
      "============= START: Performing Query on Product Asset ============="
    );

    // Parse the selectorQueryString to JSON object
    const selectorQuery = JSON.parse(selectorQueryString);

    // Here selectorQuery Must be a JSON Object for ex:- {queryField : FieldValue}
    if (typeof selectorQuery != "object" || Array.isArray(selectorQuery)) {
      throw new Error("selectorQuery parameter is not a valid JSON!");
    }
    const query = {
      selector: selectorQuery,
    };
    console.info(`**-- Query: ${query} --**`);

    // getQueryResult() returns 'StateQueryIterator' object
    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const allResults = [];
    while (true) {
      const res = await iterator.next();

      if (res.value && res.value.value.toString()) {
        console.info(res.value.value.toString("utf8"));

        const Key = res.value.key;
        let Record;
        try {
          Record = JSON.parse(res.value.value.toString("utf8"));
        } catch (error) {
          console.error(`-- Error - ${error} --`);
          Record = res.value.value.toString("utf8");
        }
        allResults.push({ Key, Record });
      }
      if (res.done) {
        console.info("-- End of QueryResult data --");
        await iterator.close();
        return JSON.stringify(allResults);
      }
    }
  }

  // Fetch the history for key
  async getHistoryForKey(ctx, key) {
    console.info("============= START: getHistoryForKey =============");
    console.info(`-- Key : ${key} --`);
    // call getHistoryForKey API method - returns iterator
    const iterator = await ctx.stub.getHistoryForKey(key);
    const allResults = [];
    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        console.info(res.value.value.toString("utf8"));
        const Key = res.value.key;
        let Record;
        try {
          Record = JSON.parse(res.value.value.toString("utf8"));
        } catch (error) {
          console.error(`-- Error - ${error} --`);
          Record = res.value.value.toString("utf8");
        }
        allResults.push({ Key, Record });
      }
      if (res.done) {
        console.info("-- End of QueryResult data --");
        await iterator.close();
        return JSON.stringify(allResults);
      }
    }
  }
}

module.exports = FabricLedgerContract;
