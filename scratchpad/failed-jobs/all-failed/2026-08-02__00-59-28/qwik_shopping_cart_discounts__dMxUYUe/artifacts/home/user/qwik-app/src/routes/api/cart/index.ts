import type { RequestHandler } from "@builder.io/qwik-city";
import { getCartState, updateCartItem, applyCoupon, clearCart } from "~/lib/cart";

export const onGet: RequestHandler = async ({ json }) => {
  const state = getCartState();
  json(200, state);
};

export const onPost: RequestHandler = async ({ request, json }) => {
  try {
    const body = await request.json();
    const { action } = body as { action: string; productId?: number; quantity?: number; code?: string };

    let state;

    switch (action) {
      case "update": {
        const productId = (body as { productId: number }).productId;
        const quantity = (body as { quantity: number }).quantity;
        if (productId === undefined || quantity === undefined) {
          json(400, { error: "Missing productId or quantity" });
          return;
        }
        state = updateCartItem(productId, quantity);
        break;
      }
      case "applyCoupon": {
        const code = (body as { code: string }).code;
        if (!code) {
          json(400, { error: "Missing coupon code" });
          return;
        }
        state = applyCoupon(code);
        break;
      }
      case "clear": {
        state = clearCart();
        break;
      }
      default: {
        json(400, { error: "Invalid action" });
        return;
      }
    }

    json(200, state);
  } catch (e) {
    json(400, { error: "Invalid request body" });
  }
};
