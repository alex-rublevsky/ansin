import { createProductAction } from "@/actions/dashboard/products/createProduct";
import { deleteProductAction } from "@/actions/dashboard/products/deleteProduct";
import { updateProductAction } from "@/actions/dashboard/products/updateProduct";

export const server = {
  product: {
    createProduct: createProductAction,
    updateProduct: updateProductAction,
    deleteProduct: deleteProductAction,
  },
};
