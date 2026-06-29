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

router.route("/getProduct").post(getProductById);

router
  .route("/:productNumber")
  .delete(deleteProductById)
  .patch(updateProductOwner);

router.route("/queryByProductOwner").post(queryOnProductOwner);

router.route("/queryByProductName").post(queryOnProductName);

// Pagination router for queryByProductOwner
router
  .route("/queryByProductOwnerWithPagination")
  .post(queryOnProductOwnerWithPagination);

router.route("/getTxnHistory").post(getTransactionHistory);

// add data with composite key
router.route("/addProductCompositeKey").post(addProductWithCompositeKey);
// query data with partial composite key
router.route("/queryByPartialCompositeKey").post(queryOnProductWithPartialCompositeKey);
// query data with key range
router.route("/queryProductByKeyRange").post(queryOnProductByKeyRange);

export default router;
