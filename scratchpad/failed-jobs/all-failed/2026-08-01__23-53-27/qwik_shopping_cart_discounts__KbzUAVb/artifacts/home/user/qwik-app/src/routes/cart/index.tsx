import { component$, useSignal, $ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getCartState, type CartState } from "../../cartHelper";
import { getDb } from "../../db";

export interface Product {
  id: number;
  name: string;
  price: number;
}

export const usePageData = routeLoader$(() => {
  const db = getDb();
  const products = db.prepare("SELECT id, name, price FROM Product").all() as Product[];
  const cartState = getCartState();
  return {
    products,
    cartState,
  };
});

export default component$(() => {
  const pageData = usePageData();
  const cartState = useSignal<CartState>(pageData.value.cartState);
  const couponCodeInput = useSignal("");

  const updateQty = $(async (productId: number, quantity: number) => {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", productId, quantity }),
    });
    if (res.ok) {
      cartState.value = await res.json();
    }
  });

  const applyCoupon = $(async () => {
    const code = couponCodeInput.value.trim();
    if (!code) return;
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "applyCoupon", code }),
    });
    if (res.ok) {
      cartState.value = await res.json();
      couponCodeInput.value = "";
    }
  });

  const clearCart = $(async () => {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear" }),
    });
    if (res.ok) {
      cartState.value = await res.json();
      couponCodeInput.value = "";
    }
  });

  return (
    <div class="container">
      <div class="header">
        <h1>Shopping Cart & Coupon Engine</h1>
      </div>

      {cartState.value.error && (
        <div class="alert alert-danger" role="alert">
          <strong>Error: </strong> {cartState.value.error}
        </div>
      )}

      <div class="grid">
        {/* Left Column: Products and Cart Items */}
        <div>
          {/* Available Products */}
          <div class="card">
            <h2 class="card-title">Available Products</h2>
            <div class="product-list">
              {pageData.value.products.map((prod) => {
                const cartItem = cartState.value.items.find(
                  (item) => item.productId === prod.id
                );
                return (
                  <div key={prod.id} class="product-item">
                    <div>
                      <div class="product-name">{prod.name}</div>
                      <div class="product-price">${prod.price.toFixed(2)}</div>
                    </div>
                    {cartItem ? (
                      <div class="qty-control">
                        <button
                          class="btn btn-secondary btn-sm"
                          onClick$={() =>
                            updateQty(prod.id, cartItem.quantity - 1)
                          }
                        >
                          -
                        </button>
                        <input
                          type="number"
                          class="qty-input"
                          value={cartItem.quantity}
                          onChange$={(e) => {
                            const val = parseInt(
                              (e.target as HTMLInputElement).value,
                              10
                            );
                            updateQty(prod.id, isNaN(val) ? 0 : val);
                          }}
                        />
                        <button
                          class="btn btn-secondary btn-sm"
                          onClick$={() =>
                            updateQty(prod.id, cartItem.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        class="btn btn-primary btn-sm"
                        onClick$={() => updateQty(prod.id, 1)}
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart Items List */}
          <div class="card">
            <h2 class="card-title">Your Cart Items</h2>
            {cartState.value.items.length === 0 ? (
              <div class="empty-cart">Your cart is empty.</div>
            ) : (
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartState.value.items.map((item) => (
                      <tr key={item.productId}>
                        <td>{item.name}</td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>
                          <div class="qty-control">
                            <button
                              class="btn btn-secondary btn-sm"
                              onClick$={() =>
                                updateQty(item.productId, item.quantity - 1)
                              }
                            >
                              -
                            </button>
                            <input
                              type="number"
                              class="qty-input"
                              value={item.quantity}
                              onChange$={(e) => {
                                const val = parseInt(
                                  (e.target as HTMLInputElement).value,
                                  10
                                );
                                updateQty(item.productId, isNaN(val) ? 0 : val);
                              }}
                            />
                            <button
                              class="btn btn-secondary btn-sm"
                              onClick$={() =>
                                updateQty(item.productId, item.quantity + 1)
                              }
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td>${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cart Summary */}
        <div>
          <div class="card">
            <h2 class="card-title">Order Summary</h2>
            <div class="summary-row">
              <span>Subtotal</span>
              <span>${cartState.value.subtotal.toFixed(2)}</span>
            </div>

            <div class="summary-row">
              <span>Applied Coupon</span>
              {cartState.value.coupon ? (
                <span class="coupon-badge">
                  {cartState.value.coupon.code} ({cartState.value.coupon.type})
                </span>
              ) : (
                <span>None</span>
              )}
            </div>

            {cartState.value.coupon && (
              <div class="summary-row">
                <span>Discount</span>
                <span style={{ color: "#059669" }}>
                  -${cartState.value.discount.toFixed(2)}
                </span>
              </div>
            )}

            <div class="summary-row total">
              <span>Total</span>
              <span>${cartState.value.total.toFixed(2)}</span>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "600", margin: "0 0 0.5rem 0" }}>
                Have a Coupon?
              </h3>
              <div class="form-group">
                <input
                  type="text"
                  class="form-input"
                  placeholder="Enter coupon code"
                  value={couponCodeInput.value}
                  onInput$={(e) => {
                    couponCodeInput.value = (
                      e.target as HTMLInputElement
                    ).value;
                  }}
                />
                <button class="btn btn-primary" onClick$={applyCoupon}>
                  Apply
                </button>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <button class="btn btn-danger" style={{ width: "100%" }} onClick$={clearCart}>
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Shopping Cart & Coupon Engine",
  meta: [
    {
      name: "description",
      content: "Shopping cart with coupon engine built using Qwik and SQLite",
    },
  ],
};
