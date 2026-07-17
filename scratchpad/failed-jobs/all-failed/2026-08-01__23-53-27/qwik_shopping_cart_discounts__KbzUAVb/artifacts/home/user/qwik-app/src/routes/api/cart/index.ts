import type { RequestHandler } from "@builder.io/qwik-city";
import { getCartState } from "../../../cartHelper";
import { getDb } from "../../../db";

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const state = getCartState();
    json(200, state);
  } catch (err: any) {
    json(500, { error: err.message || "Internal Server Error" });
  }
};

export const onPost: RequestHandler = async ({ request, json }) => {
  try {
    const body = await request.json();
    const db = getDb();
    const { action } = body;

    if (action === "update") {
      const productId = Number(body.productId);
      const quantity = Number(body.quantity);

      if (isNaN(productId)) {
        json(400, { error: "Invalid productId" });
        return;
      }

      if (quantity <= 0) {
        db.prepare("DELETE FROM CartItem WHERE productId = ?").run(productId);
      } else {
        // Verify product exists first to avoid foreign key constraint violation
        const prod = db.prepare("SELECT id FROM Product WHERE id = ?").get(productId);
        if (!prod) {
          json(404, { error: "Product not found" });
          return;
        }
        db.prepare(`
          INSERT INTO CartItem (productId, quantity)
          VALUES (?, ?)
          ON CONFLICT(productId) DO UPDATE SET quantity = excluded.quantity
        `).run(productId, quantity);
      }

      const state = getCartState();
      json(200, state);
      return;
    }

    if (action === "applyCoupon") {
      const code = String(body.code || "").trim();

      // Check if coupon exists
      const coupon = db.prepare("SELECT code, minSpend FROM Coupon WHERE code = ?").get(code) as { code: string; minSpend: number } | undefined;
      if (!coupon) {
        const state = getCartState("Invalid coupon code");
        json(200, state);
        return;
      }

      // Check minSpend
      // We calculate current subtotal first
      const stateBefore = getCartState();
      if (stateBefore.subtotal < coupon.minSpend) {
        const state = getCartState("Minimum spend not met");
        json(200, state);
        return;
      }

      // Apply the coupon (clear existing coupon first to ensure at most one active coupon)
      db.prepare("DELETE FROM ActiveCoupon").run();
      db.prepare("INSERT INTO ActiveCoupon (code) VALUES (?)").run(code);

      const state = getCartState();
      json(200, state);
      return;
    }

    if (action === "clear") {
      db.prepare("DELETE FROM CartItem").run();
      db.prepare("DELETE FROM ActiveCoupon").run();

      const state = getCartState();
      json(200, state);
      return;
    }

    // Default response if action is unknown
    const state = getCartState();
    json(200, state);
  } catch (err: any) {
    json(500, { error: err.message || "Internal Server Error" });
  }
};
