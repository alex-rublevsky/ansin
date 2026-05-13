import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "./dashboard/products";

export const server = {
  dashboard: {
    createProduct: createProductAction,
    updateProduct: updateProductAction,
    deleteProduct: deleteProductAction,
  },
};
