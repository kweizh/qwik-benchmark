async function runTests() {
  const baseUrl = "http://localhost:3000/api/cart";

  console.log("Starting cart and coupon rule engine verification...");

  // Helper to make POST requests
  async function post(payload) {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  // Helper to make GET requests
  async function get() {
    const res = await fetch(baseUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  // 1. Clear cart
  console.log("\n1. Clearing cart...");
  let state = await post({ action: "clear" });
  console.log("Cart cleared:", JSON.stringify(state, null, 2));
  if (state.items.length !== 0 || state.subtotal !== 0 || state.total !== 0 || state.coupon !== null) {
    throw new Error("Clear cart failed!");
  }

  // 2. Add some items
  console.log("\n2. Adding 1 Laptop (ID 1, price 999.99) and 2 Wireless Mouses (ID 2, price 29.99)...");
  state = await post({ action: "update", productId: 1, quantity: 1 });
  state = await post({ action: "update", productId: 2, quantity: 2 });
  console.log("Updated state:", JSON.stringify(state, null, 2));

  // Verify sorting and calculation
  if (state.items[0].productId !== 1 || state.items[1].productId !== 2) {
    throw new Error("Items are not sorted by productId ascending!");
  }
  const expectedSubtotal = 999.99 + 29.99 * 2; // 1059.97
  if (state.subtotal !== expectedSubtotal) {
    throw new Error(`Expected subtotal ${expectedSubtotal}, got ${state.subtotal}`);
  }

  // 3. Apply SAVE10 (PERCENT, value 10, minSpend 0)
  console.log("\n3. Applying SAVE10 (10% off)...");
  state = await post({ action: "applyCoupon", code: "SAVE10" });
  console.log("SAVE10 applied:", JSON.stringify(state, null, 2));
  const expectedDiscount = Number((expectedSubtotal * 0.1).toFixed(2)); // 106.00
  const expectedTotal = Number((expectedSubtotal - expectedDiscount).toFixed(2)); // 953.97
  if (state.discount !== expectedDiscount || state.total !== expectedTotal) {
    throw new Error(`SAVE10 math incorrect! Expected discount ${expectedDiscount}, total ${expectedTotal}`);
  }

  // 4. Apply BOGO2 (BOGO on product 2)
  console.log("\n4. Applying BOGO2 (Buy 1 Get 1 on Product 2)...");
  state = await post({ action: "applyCoupon", code: "BOGO2" });
  console.log("BOGO2 applied:", JSON.stringify(state, null, 2));
  const expectedBogoDiscount = 29.99; // 1 free mouse
  const expectedBogoTotal = Number((expectedSubtotal - expectedBogoDiscount).toFixed(2)); // 1029.98
  if (state.discount !== expectedBogoDiscount || state.total !== expectedBogoTotal) {
    throw new Error(`BOGO2 math incorrect! Expected discount ${expectedBogoDiscount}, total ${expectedBogoTotal}`);
  }

  // 5. Test minSpend validation on Apply
  console.log("\n5. Testing minSpend validation on Apply...");
  // Clear cart first
  await post({ action: "clear" });
  // Add 1 Wireless Mouse (subtotal 29.99)
  state = await post({ action: "update", productId: 2, quantity: 1 });
  // Try to apply FLAT15 (minSpend 30.0)
  state = await post({ action: "applyCoupon", code: "FLAT15" });
  console.log("Applied FLAT15 on subtotal 29.99:", JSON.stringify(state, null, 2));
  if (state.error !== "Minimum spend not met" || state.coupon !== null) {
    throw new Error("FLAT15 should have failed with 'Minimum spend not met'");
  }

  // 6. Test minSpend validation on Cart Modification
  console.log("\n6. Testing minSpend validation on Cart Modification...");
  // Add another Wireless Mouse (subtotal 59.98 >= 30.0)
  state = await post({ action: "update", productId: 2, quantity: 2 });
  // Apply FLAT15
  state = await post({ action: "applyCoupon", code: "FLAT15" });
  console.log("Applied FLAT15 on subtotal 59.98:", JSON.stringify(state, null, 2));
  if (state.coupon?.code !== "FLAT15" || state.discount !== 15.0) {
    throw new Error("FLAT15 should have been successfully applied");
  }

  // Decrease quantity to 1 (subtotal 29.99 < 30.0)
  state = await post({ action: "update", productId: 2, quantity: 1 });
  console.log("Decreased quantity to 1 (subtotal 29.99):", JSON.stringify(state, null, 2));
  if (state.error !== "Minimum spend not met" || state.coupon !== null || state.discount !== 0.0) {
    throw new Error("Active coupon should have been automatically removed with error 'Minimum spend not met'");
  }

  // 7. Test invalid coupon code
  console.log("\n7. Testing invalid coupon code...");
  state = await post({ action: "applyCoupon", code: "INVALID_CODE" });
  console.log("Applied INVALID_CODE:", JSON.stringify(state, null, 2));
  if (state.error !== "Invalid coupon code" || state.coupon !== null) {
    throw new Error("Should have failed with 'Invalid coupon code'");
  }

  console.log("\nAll tests passed successfully! 🚀");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
