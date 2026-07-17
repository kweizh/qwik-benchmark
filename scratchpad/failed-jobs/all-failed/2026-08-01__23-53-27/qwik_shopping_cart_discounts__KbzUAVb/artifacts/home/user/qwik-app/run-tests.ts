import assert from "assert";

const BASE_URL = "http://localhost:3000/api/cart";

async function request(action: string, payload: Record<string, any> = {}) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

async function getCart() {
  const res = await fetch(BASE_URL);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

async function runTests() {
  console.log("Starting Shopping Cart & Coupon Engine Integration Tests...\n");

  // 1. Clear cart
  console.log("Scenario 1: Clear cart...");
  let state = await request("clear");
  assert.strictEqual(state.items.length, 0);
  assert.strictEqual(state.subtotal, 0);
  assert.strictEqual(state.coupon, null);
  assert.strictEqual(state.discount, 0);
  assert.strictEqual(state.total, 0);
  assert.strictEqual(state.error, null);
  console.log("✓ Clear cart passed.");

  // 2. Add some items
  console.log("\nScenario 2: Add 1 Laptop (ID 1, price 1000) and 1 Headphones (ID 2, price 100)...");
  state = await request("update", { productId: 1, quantity: 1 });
  state = await request("update", { productId: 2, quantity: 1 });
  assert.strictEqual(state.items.length, 2);
  assert.strictEqual(state.items[0].productId, 1);
  assert.strictEqual(state.items[0].quantity, 1);
  assert.strictEqual(state.items[0].total, 1000);
  assert.strictEqual(state.items[1].productId, 2);
  assert.strictEqual(state.items[1].quantity, 1);
  assert.strictEqual(state.items[1].total, 100);
  assert.strictEqual(state.subtotal, 1100);
  console.log("✓ Add items passed.");

  // 3. Apply PERCENT coupon (SAVE10, value 10%, minSpend 100)
  console.log("\nScenario 3: Apply PERCENT coupon SAVE10...");
  state = await request("applyCoupon", { code: "SAVE10" });
  assert.strictEqual(state.coupon?.code, "SAVE10");
  assert.strictEqual(state.coupon?.type, "PERCENT");
  assert.strictEqual(state.discount, 110); // 10% of 1100
  assert.strictEqual(state.total, 990);
  assert.strictEqual(state.error, null);
  console.log("✓ PERCENT coupon passed.");

  // 4. Apply PERCENT coupon (SAVE20, value 20%, minSpend 200)
  console.log("\nScenario 4: Apply PERCENT coupon SAVE20 (should replace SAVE10)...");
  state = await request("applyCoupon", { code: "SAVE20" });
  assert.strictEqual(state.coupon?.code, "SAVE20");
  assert.strictEqual(state.coupon?.type, "PERCENT");
  assert.strictEqual(state.discount, 220); // 20% of 1100
  assert.strictEqual(state.total, 880);
  assert.strictEqual(state.error, null);
  console.log("✓ Coupon replacement passed.");

  // 5. Try to apply invalid coupon
  console.log("\nScenario 5: Apply invalid coupon code...");
  state = await request("applyCoupon", { code: "INVALID_CODE" });
  // The active coupon should STILL be SAVE20 because applyCoupon failed
  assert.strictEqual(state.coupon?.code, "SAVE20");
  assert.strictEqual(state.error, "Invalid coupon code");
  console.log("✓ Invalid coupon code error and persistence passed.");

  // 6. Try to apply coupon with minSpend not met
  console.log("\nScenario 6: Apply FLAT50 but subtotal is less than minSpend... first clear cart and add 1 Headphones...");
  await request("clear");
  state = await request("update", { productId: 2, quantity: 1 }); // subtotal 100
  state = await request("applyCoupon", { code: "FLAT50" }); // minSpend 150
  assert.strictEqual(state.coupon, null);
  assert.strictEqual(state.error, "Minimum spend not met");
  console.log("✓ minSpend validation on application passed.");

  // 7. Apply FLAT15 coupon (value 15, minSpend 50) when subtotal is 100
  console.log("\nScenario 7: Apply FLAT15 (minSpend 50, subtotal 100)...");
  state = await request("applyCoupon", { code: "FLAT15" });
  assert.strictEqual(state.coupon?.code, "FLAT15");
  assert.strictEqual(state.discount, 15);
  assert.strictEqual(state.total, 85);
  assert.strictEqual(state.error, null);
  console.log("✓ FLAT15 application passed.");

  // 8. Invalidate coupon on quantity update
  console.log("\nScenario 8: Decrease quantity of Headphones to 0 (subtotal becomes 0, FLAT15 minSpend is 50)...");
  state = await request("update", { productId: 2, quantity: 0 });
  assert.strictEqual(state.items.length, 0);
  assert.strictEqual(state.subtotal, 0);
  assert.strictEqual(state.coupon, null); // should be automatically removed
  assert.strictEqual(state.discount, 0);
  assert.strictEqual(state.total, 0);
  assert.strictEqual(state.error, "Minimum spend not met");
  console.log("✓ Automated coupon invalidation on update passed.");

  // 9. BOGO Coupon testing
  console.log("\nScenario 9: BOGO coupon (BOGOHP for product 2, minSpend 0)...");
  // Add 1 Headphones (ID 2)
  state = await request("update", { productId: 2, quantity: 1 });
  state = await request("applyCoupon", { code: "BOGOHP" });
  assert.strictEqual(state.coupon?.code, "BOGOHP");
  assert.strictEqual(state.discount, 0); // quantity of 1 -> 0 free
  assert.strictEqual(state.total, 100);

  // Add 1 more Headphones (total 2)
  state = await request("update", { productId: 2, quantity: 2 });
  assert.strictEqual(state.discount, 100); // quantity of 2 -> 1 free (100)
  assert.strictEqual(state.total, 100);

  // Add 1 more Headphones (total 3)
  state = await request("update", { productId: 2, quantity: 3 });
  assert.strictEqual(state.discount, 100); // quantity of 3 -> 1 free (100)
  assert.strictEqual(state.total, 200);

  // Add 1 more Headphones (total 4)
  state = await request("update", { productId: 2, quantity: 4 });
  assert.strictEqual(state.discount, 200); // quantity of 4 -> 2 free (200)
  assert.strictEqual(state.total, 200);
  console.log("✓ BOGO coupon rules passed.");

  // 10. FIXED coupon capping at $0.00
  console.log("\nScenario 10: FIXED coupon capping total at $0.00...");
  // Clear and add 1 Mouse (ID 3, price 50)
  await request("clear");
  state = await request("update", { productId: 3, quantity: 1 }); // subtotal 50
  // Apply FLAT50 (value 50, minSpend 150) -> wait, minSpend is 150, so let's apply FLAT15 but let's see if we can find a coupon that exceeds subtotal.
  // Wait, let's insert a custom coupon for testing FIXED capping, or let's use FLAT15 on a subtotal of 10?
  // Let's first add a product with a small price, say price 10. But we don't have a product with price 10.
  // We can insert a product with price 10 or just insert a coupon with value 100, minSpend 50.
  // Let's insert a custom coupon: code "FLATCAPPED", type "FIXED", value 100, minSpend 50.
  // We can do this by updating the DB or we can just verify the logic.
  // Let's add a product or coupon to test. Let's insert a coupon via SQLite.
  const db = (await import("./src/db")).getDb();
  db.prepare("INSERT OR REPLACE INTO Coupon (code, type, value, minSpend) VALUES (?, ?, ?, ?)").run("FLATCAPPED", "FIXED", 100.0, 50.0);
  
  state = await request("applyCoupon", { code: "FLATCAPPED" });
  assert.strictEqual(state.coupon?.code, "FLATCAPPED");
  assert.strictEqual(state.subtotal, 50);
  assert.strictEqual(state.discount, 50); // Capped at subtotal
  assert.strictEqual(state.total, 0); // Capped at 0
  console.log("✓ FIXED coupon capping passed.");

  // 11. GET /api/cart verification
  console.log("\nScenario 11: GET /api/cart verification...");
  state = await getCart();
  assert.strictEqual(state.subtotal, 50);
  assert.strictEqual(state.coupon?.code, "FLATCAPPED");
  assert.strictEqual(state.discount, 50);
  assert.strictEqual(state.total, 0);
  console.log("✓ GET /api/cart verification passed.");

  console.log("\n==================================================");
  console.log("ALL TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
