import type { RequestHandler } from "@builder.io/qwik-city";
import {
  applyCoupon,
  clearCart,
  getCartState,
  updateCartItemQuantity,
} from "~/lib/cart";

type CartAction =
  | { action: "update"; productId: number; quantity: number }
  | { action: "applyCoupon"; code: string }
  | { action: "clear" };

export const onGet: RequestHandler = async (requestEvent) => {
  const state = getCartState();
  requestEvent.json(200, state);
};

export const onPost: RequestHandler = async (requestEvent) => {
  let body: unknown;
  try {
    body = await requestEvent.parseBody();
  } catch {
    body = null;
  }

  if (!body || typeof body !== "object") {
    requestEvent.json(400, {
      ...getCartState(),
      error: "Invalid request body",
    });
    return;
  }

  const payload = body as Partial<CartAction> & Record<string, unknown>;

  switch (payload.action) {
    case "update": {
      const productId = Number((payload as any).productId);
      const quantity = Number((payload as any).quantity);
      if (!Number.isFinite(productId) || !Number.isFinite(quantity)) {
        requestEvent.json(400, {
          ...getCartState(),
          error: "Invalid product or quantity",
        });
        return;
      }
      const state = updateCartItemQuantity(productId, quantity);
      requestEvent.json(200, state);
      return;
    }

    case "applyCoupon": {
      const code = String((payload as any).code ?? "");
      const state = applyCoupon(code);
      requestEvent.json(200, state);
      return;
    }

    case "clear": {
      const state = clearCart();
      requestEvent.json(200, state);
      return;
    }

    default: {
      requestEvent.json(400, {
        ...getCartState(),
        error: "Unknown action",
      });
      return;
    }
  }
};
