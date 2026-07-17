import type { RequestHandler } from "@builder.io/qwik-city";
import { getCartState, updateQuantity, applyCoupon, clearCart } from "../../../db";

export const onGet: RequestHandler = async (event) => {
  const state = getCartState();
  event.json(200, state);
};

export const onPost: RequestHandler = async (event) => {
  try {
    const body = (await event.request.json()) as any;

    if (!body || typeof body !== "object") {
      event.json(400, { error: "Invalid request body" });
      return;
    }

    const { action } = body;

    let state;
    if (action === "update") {
      const productId = Number(body.productId);
      const quantity = Number(body.quantity);
      if (isNaN(productId) || isNaN(quantity)) {
        event.json(400, { error: "Invalid productId or quantity" });
        return;
      }
      state = updateQuantity(productId, quantity);
    } else if (action === "applyCoupon") {
      const code = String(body.code || "");
      state = applyCoupon(code);
    } else if (action === "clear") {
      state = clearCart();
    } else {
      event.json(400, { error: "Unknown action" });
      return;
    }

    event.json(200, state);
  } catch (err: any) {
    event.json(400, { error: err.message || "Bad Request" });
  }
};
