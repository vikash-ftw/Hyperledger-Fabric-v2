"use strict";

import { Router } from "express";
import {
  addProduct,
  getProductById,
  deleteProductById,
  updateProductOwner,
  queryOnProductOwner,
  queryOnProductName,
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

export default router;
