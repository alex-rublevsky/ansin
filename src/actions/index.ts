import { createProductAction } from "@/actions/dashboard/products/createProduct";
import { deleteProductAction } from "@/actions/dashboard/products/deleteProduct";
import { updateProductAction } from "@/actions/dashboard/products/updateProduct";
import { createOrderAction } from "@/actions/orders/createOrder";

export const server = {
  product: {
    createProduct: createProductAction,
    updateProduct: updateProductAction,
    deleteProduct: deleteProductAction,
  },
  orders: {
    create: createOrderAction,
  },
};
