"use strict";

import { Router } from "express";
import {
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
} from "../controllers/product.controller.js";

const router = Router();

router.route("/addProduct").post(addProduct);

router.route("/getProduct").get(getProductById);

router
  .route("/:productNumber")
  .delete(deleteProductById)
  .patch(updateProductOwner);

router.route("/queryByProductOwner").get(queryOnProductOwner);

router.route("/queryByProductName").get(queryOnProductName);

// Pagination router for queryByProductOwner
router
  .route("/queryByProductOwnerWithPagination")
  .get(queryOnProductOwnerWithPagination);

router.route("/getTxnHistory").get(getTransactionHistory);

// add data with composite key
router.route("/addProductCompositeKey").post(addProductWithCompositeKey);
// query data with partial composite key
router.route("/queryByPartialCompositeKey").get(queryOnProductWithPartialCompositeKey);
// query data with key range
router.route("/queryProductByKeyRange").get(queryOnProductByKeyRange);

export default router;
