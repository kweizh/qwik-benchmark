import { component$, useSignal, $ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { getDb, calculateCartState } from "../../db";

export const useCartData = routeLoader$(async () => {
  const db = getDb();
  const cart = calculateCartState(db);
  const products = db.prepare("SELECT id, name, price FROM Product").all() as {
    id: number;
    name: string;
    price: number;
  }[];
  return { cart, products };
});

export default component$(() => {
  const data = useCartData();
  const cartState = useSignal(data.value.cart);
  const couponCodeInput = useSignal("");

  const handleUpdateQuantity = $(async (productId: number, newQty: number) => {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", productId, quantity: newQty }),
      });
      if (res.ok) {
        cartState.value = await res.json();
      }
    } catch (err) {
      console.error(err);
    }
  });

  const handleApplyCoupon = $(async () => {
    const code = couponCodeInput.value.trim();
    if (!code) return;
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "applyCoupon", code }),
      });
      if (res.ok) {
        cartState.value = await res.json();
        if (!cartState.value.error) {
          couponCodeInput.value = "";
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  const handleClearCart = $(async () => {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      if (res.ok) {
        cartState.value = await res.json();
        couponCodeInput.value = "";
      }
    } catch (err) {
      console.error(err);
    }
  });

  return (
    <div class="container">
      <style>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .header h1 {
          font-size: 2.5rem;
          color: #111;
          margin-bottom: 0.5rem;
        }
        .header p {
          color: #666;
          font-size: 1.1rem;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 768px) {
          .grid {
            grid-template-columns: 1.6fr 1fr;
          }
        }
        .card {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid #eaeaea;
        }
        .card-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 0.75rem;
          color: #222;
        }
        .product-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .product-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          border: 1px solid #f0f0f0;
          border-radius: 6px;
          background: #fafafa;
        }
        .product-info h3 {
          font-weight: 600;
          margin: 0;
          font-size: 1.1rem;
        }
        .product-info p {
          margin: 0.25rem 0 0;
          color: #666;
        }
        .btn {
          background: #0070f3;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 0.95rem;
        }
        .btn:hover {
          background: #0051a2;
        }
        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }
        .btn-secondary:hover {
          background: #e0e0e0;
        }
        .btn-danger {
          background: #ff4d4f;
          color: #fff;
        }
        .btn-danger:hover {
          background: #d9363e;
        }
        .cart-table {
          width: 100%;
          border-collapse: collapse;
        }
        .cart-table th, .cart-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #f0f0f0;
        }
        .cart-table th {
          font-weight: 600;
          color: #666;
          font-size: 0.95rem;
        }
        .qty-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .qty-btn {
          background: #eaeaea;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          color: #333;
        }
        .qty-btn:hover {
          background: #dcdcdc;
        }
        .qty-display {
          font-weight: 600;
          min-width: 20px;
          text-align: center;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          font-size: 1.05rem;
        }
        .summary-row.total {
          font-size: 1.4rem;
          font-weight: bold;
          border-top: 2px solid #f0f0f0;
          padding-top: 1rem;
          margin-top: 1rem;
          color: #111;
        }
        .coupon-box {
          display: flex;
          gap: 0.5rem;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }
        .coupon-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
        }
        .error-banner {
          background: #fff0f0;
          border: 1px solid #ffcccc;
          color: #d00000;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          font-weight: 500;
        }
        .active-coupon-badge {
          background: #e6f7ff;
          border: 1px solid #91d5ff;
          color: #0050b3;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 500;
          display: inline-block;
          margin-top: 0.25rem;
        }
        .empty-cart-text {
          color: #888;
          text-align: center;
          padding: 2rem 0;
          font-style: italic;
        }
        .action-bar {
          display: flex;
          justify-content: flex-end;
          margin-top: 1rem;
        }
      `}</style>

      <div class="header">
        <h1>⚡ Qwik Coupon Cart</h1>
        <p>A secure shopping cart and server-side coupon discount engine</p>
      </div>

      {cartState.value.error && (
        <div class="error-banner">
          ⚠️ Error: {cartState.value.error}
        </div>
      )}

      <div class="grid">
        <div class="main-column">
          {/* Cart Items Card */}
          <div class="card">
            <h2 class="card-title">Your Shopping Cart</h2>
            {cartState.value.items.length === 0 ? (
              <p class="empty-cart-text">Your cart is empty. Add some products below!</p>
            ) : (
              <div>
                <table class="cart-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartState.value.items.map((item) => (
                      <tr key={item.productId}>
                        <td>{item.name}</td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>
                          <div class="qty-controls">
                            <button
                              class="qty-btn"
                              onClick$={() =>
                                handleUpdateQuantity(item.productId, item.quantity - 1)
                              }
                            >
                              -
                            </button>
                            <span class="qty-display">{item.quantity}</span>
                            <button
                              class="qty-btn"
                              onClick$={() =>
                                handleUpdateQuantity(item.productId, item.quantity + 1)
                              }
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td>${item.total.toFixed(2)}</td>
                        <td>
                          <button
                            class="btn btn-secondary btn-danger"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                            onClick$={() => handleUpdateQuantity(item.productId, 0)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div class="action-bar">
                  <button class="btn btn-danger" onClick$={handleClearCart}>
                    Clear Cart
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Shop Products Card */}
          <div class="card">
            <h2 class="card-title">Available Products</h2>
            <div class="product-list">
              {data.value.products.map((product) => {
                const inCart = cartState.value.items.find(
                  (item) => item.productId === product.id
                );
                const currentQty = inCart ? inCart.quantity : 0;
                return (
                  <div class="product-item" key={product.id}>
                    <div class="product-info">
                      <h3>{product.name}</h3>
                      <p>${product.price.toFixed(2)}</p>
                    </div>
                    <div>
                      {currentQty > 0 ? (
                        <div class="qty-controls">
                          <button
                            class="qty-btn"
                            onClick$={() =>
                              handleUpdateQuantity(product.id, currentQty - 1)
                            }
                          >
                            -
                          </button>
                          <span class="qty-display">{currentQty} in Cart</span>
                          <button
                            class="qty-btn"
                            onClick$={() =>
                              handleUpdateQuantity(product.id, currentQty + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          class="btn"
                          onClick$={() => handleUpdateQuantity(product.id, 1)}
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div class="sidebar-column">
          <div class="card">
            <h2 class="card-title">Order Summary</h2>

            <div class="summary-row">
              <span>Subtotal</span>
              <span>${cartState.value.subtotal.toFixed(2)}</span>
            </div>

            <div class="summary-row">
              <span>
                Discount
                {cartState.value.coupon && (
                  <div>
                    <span class="active-coupon-badge">
                      Code: {cartState.value.coupon.code} (
                      {cartState.value.coupon.type === "PERCENT"
                        ? `${cartState.value.coupon.value}% off`
                        : cartState.value.coupon.type === "FIXED"
                          ? `$${cartState.value.coupon.value.toFixed(2)} off`
                          : `BOGO on Product #${cartState.value.coupon.value}`}
                      )
                    </span>
                  </div>
                )}
              </span>
              <span style={{ color: cartState.value.discount > 0 ? "#52c41a" : "inherit" }}>
                -{cartState.value.discount > 0 ? "" : " "}${cartState.value.discount.toFixed(2)}
              </span>
            </div>

            <div class="summary-row total">
              <span>Total</span>
              <span>${cartState.value.total.toFixed(2)}</span>
            </div>

            <div class="coupon-box">
              <input
                type="text"
                class="coupon-input"
                placeholder="Enter Coupon Code"
                value={couponCodeInput.value}
                onInput$={(ev) =>
                  (couponCodeInput.value = (ev.target as HTMLInputElement).value)
                }
              />
              <button class="btn btn-secondary" onClick$={handleApplyCoupon}>
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
