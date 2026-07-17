import { component$, useSignal, $ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { db } from "../../utils/db";
import { getCartState, type CartState } from "../../utils/cart";

// Loader to fetch all available products for the catalog
export const useProductsLoader = routeLoader$(() => {
  return db.prepare("SELECT * FROM Product ORDER BY id ASC").all() as {
    id: number;
    name: string;
    price: number;
  }[];
});

// Loader to fetch initial cart state on server-side render
export const useCartLoader = routeLoader$(() => {
  return getCartState();
});

export default component$(() => {
  const products = useProductsLoader();
  const initialCart = useCartLoader();
  
  // Store the cart state in a signal initialized with the server-side loaded cart
  const cartState = useSignal<CartState>(initialCart.value);
  const couponInput = useSignal("");

  // Helper to send action to API and update state
  const performAction = $(async (actionPayload: any) => {
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actionPayload),
      });
      if (response.ok) {
        const newState = await response.json();
        cartState.value = newState;
      } else {
        const errData = await response.json();
        cartState.value = {
          ...cartState.value,
          error: errData.error || "An error occurred",
        };
      }
    } catch (err: any) {
      cartState.value = {
        ...cartState.value,
        error: err.message || "Failed to connect to server",
      };
    }
  });

  return (
    <div class="container">
      <header class="header">
        <h1>⚡ Qwik Shopping Cart & Coupon Engine</h1>
        <p class="subtitle">Secure server-side calculations & coupon rule validation</p>
      </header>

      <main class="main-layout">
        {/* Left Side: Product Catalog & Cart Items */}
        <div class="left-column">
          {/* Catalog Section */}
          <section class="section-card">
            <h2 class="section-title">🛍️ Available Products</h2>
            <div class="products-grid">
              {products.value.map((product) => {
                const cartItem = cartState.value.items.find(
                  (item) => item.productId === product.id
                );
                const currentQty = cartItem ? cartItem.quantity : 0;

                return (
                  <div key={product.id} class="product-card">
                    <div class="product-info">
                      <span class="product-name">{product.name}</span>
                      <span class="product-price">${product.price.toFixed(2)}</span>
                    </div>
                    <div class="product-actions">
                      {currentQty > 0 ? (
                        <div class="qty-control">
                          <button
                            class="btn-qty"
                            onClick$={() =>
                              performAction({
                                action: "update",
                                productId: product.id,
                                quantity: currentQty - 1,
                              })
                            }
                          >
                            -
                          </button>
                          <span class="qty-display">{currentQty}</span>
                          <button
                            class="btn-qty"
                            onClick$={() =>
                              performAction({
                                action: "update",
                                productId: product.id,
                                quantity: currentQty + 1,
                              })
                            }
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          class="btn-add"
                          onClick$={() =>
                            performAction({
                              action: "update",
                              productId: product.id,
                              quantity: 1,
                            })
                          }
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Cart Items Section */}
          <section class="section-card">
            <h2 class="section-title">🛒 Your Cart</h2>
            {cartState.value.items.length === 0 ? (
              <div class="empty-cart-message">
                Your cart is empty. Choose some products from the catalog above!
              </div>
            ) : (
              <div class="cart-items-list">
                {cartState.value.items.map((item) => (
                  <div key={item.productId} class="cart-item-row">
                    <div class="item-details">
                      <span class="item-name">{item.name}</span>
                      <span class="item-price-unit">
                        ${item.price.toFixed(2)} each
                      </span>
                    </div>
                    <div class="item-actions-total">
                      <div class="qty-control">
                        <button
                          class="btn-qty"
                          onClick$={() =>
                            performAction({
                              action: "update",
                              productId: item.productId,
                              quantity: item.quantity - 1,
                            })
                          }
                        >
                          -
                        </button>
                        <span class="qty-display">{item.quantity}</span>
                        <button
                          class="btn-qty"
                          onClick$={() =>
                            performAction({
                              action: "update",
                              productId: item.productId,
                              quantity: item.quantity + 1,
                            })
                          }
                        >
                          +
                        </button>
                      </div>
                      <span class="item-total-price">
                        ${item.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Side: Summary & Coupon Rules */}
        <div class="right-column">
          {/* Summary Card */}
          <section class="section-card summary-card">
            <h2 class="section-title">💳 Order Summary</h2>

            {/* Error Message Alert */}
            {cartState.value.error && (
              <div class="error-alert">
                <span class="error-icon">⚠️</span>
                <span class="error-text">{cartState.value.error}</span>
              </div>
            )}

            <div class="summary-details">
              <div class="summary-row">
                <span>Subtotal</span>
                <span class="val-subtotal">${cartState.value.subtotal.toFixed(2)}</span>
              </div>

              {cartState.value.coupon && (
                <div class="summary-row coupon-row-active">
                  <div class="coupon-tag">
                    <span class="tag-icon">🏷️</span>
                    <span class="tag-text">
                      {cartState.value.coupon.code} ({cartState.value.coupon.type})
                    </span>
                  </div>
                  <span class="val-discount text-green">
                    -${cartState.value.discount.toFixed(2)}
                  </span>
                </div>
              )}

              <div class="summary-row total-row">
                <span>Total</span>
                <span class="val-total">${cartState.value.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Coupon Application Form */}
            <div class="coupon-form">
              <label for="coupon-input" class="coupon-label">
                Have a coupon?
              </label>
              <div class="coupon-input-group">
                <input
                  id="coupon-input"
                  type="text"
                  placeholder="Enter code (e.g. SAVE10)"
                  class="input-coupon"
                  value={couponInput.value}
                  onInput$={(e) => {
                    couponInput.value = (e.target as HTMLInputElement).value;
                  }}
                />
                <button
                  class="btn-apply"
                  onClick$={() => {
                    if (couponInput.value.trim()) {
                      performAction({
                        action: "applyCoupon",
                        code: couponInput.value.trim(),
                      });
                      couponInput.value = "";
                    }
                  }}
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div class="summary-actions">
              <button
                class="btn-clear"
                onClick$={() => performAction({ action: "clear" })}
                disabled={
                  cartState.value.items.length === 0 && !cartState.value.coupon
                }
              >
                Clear Cart & Coupons
              </button>
            </div>
          </section>

          {/* Information / Help Card */}
          <section class="section-card help-card">
            <h3 class="help-title">💡 Available Coupons for Testing</h3>
            <ul class="help-list">
              <li>
                <strong><code>SAVE10</code></strong>: 10% Off (Min Spend $50.00)
              </li>
              <li>
                <strong><code>SAVE50</code></strong>: 50% Off (Min Spend $500.00)
              </li>
              <li>
                <strong><code>FLAT20</code></strong>: $20.00 Off (Min Spend $100.00)
              </li>
              <li>
                <strong><code>BOGO2</code></strong>: Buy One Get One Free on <strong>Headphones</strong> (Min Spend $0.00)
              </li>
              <li>
                <strong><code>BOGO3</code></strong>: Buy One Get One Free on <strong>T-Shirt</strong> (Min Spend $15.00)
              </li>
            </ul>
          </section>
        </div>
      </main>

      {/* Styled block for scoped modern styles */}
      <style>{`
        :global(body) {
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background-color: #f3f4f6;
          color: #1f2937;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .header h1 {
          font-size: 2.5rem;
          color: #111827;
          margin: 0 0 0.5rem 0;
          font-weight: 800;
          letter-spacing: -0.025em;
        }

        .subtitle {
          font-size: 1.1rem;
          color: #6b7280;
          margin: 0;
        }

        .main-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 768px) {
          .main-layout {
            grid-template-columns: 7fr 5fr;
          }
        }

        .section-card {
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid #e5e7eb;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 1.25rem;
          color: #111827;
          border-bottom: 2px solid #f3f4f6;
          padding-bottom: 0.75rem;
        }

        /* Products Catalog */
        .products-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        @media (min-width: 480px) {
          .products-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .product-card {
          border: 1px solid #f3f4f6;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background-color: #f9fafb;
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
        }

        .product-info {
          display: flex;
          flex-direction: column;
          margin-bottom: 1rem;
        }

        .product-name {
          font-weight: 600;
          font-size: 1.05rem;
          color: #111827;
        }

        .product-price {
          color: #4b5563;
          font-size: 0.95rem;
          margin-top: 0.25rem;
        }

        .btn-add {
          width: 100%;
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          padding: 0.6rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .btn-add:hover {
          background-color: #1d4ed8;
        }

        /* Qty Control */
        .qty-control {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
        }

        .btn-qty {
          background-color: transparent;
          border: none;
          color: #374151;
          font-size: 1.2rem;
          font-weight: bold;
          padding: 0.4rem 1rem;
          cursor: pointer;
          transition: background-color 0.15s;
          width: 40px;
        }

        .btn-qty:hover {
          background-color: #d1d5db;
        }

        .qty-display {
          font-weight: 700;
          padding: 0 0.5rem;
          min-width: 25px;
          text-align: center;
        }

        /* Cart Items */
        .empty-cart-message {
          text-align: center;
          color: #9ca3af;
          padding: 2rem 0;
          font-style: italic;
        }

        .cart-items-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .cart-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .cart-item-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .item-details {
          display: flex;
          flex-direction: column;
        }

        .item-name {
          font-weight: 600;
          color: #111827;
        }

        .item-price-unit {
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 0.15rem;
        }

        .item-actions-total {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .item-total-price {
          font-weight: 700;
          font-size: 1.1rem;
          color: #111827;
          min-width: 80px;
          text-align: right;
        }

        /* Summary Card */
        .summary-card {
          background-color: #1e293b;
          color: #f8fafc;
          border: none;
        }

        .summary-card .section-title {
          color: #f8fafc;
          border-bottom-color: #334155;
        }

        .error-alert {
          background-color: #fef2f2;
          border: 1px solid #fca5a5;
          color: #991b1b;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .error-icon {
          font-size: 1.1rem;
        }

        .summary-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 1.05rem;
          color: #cbd5e1;
        }

        .coupon-row-active {
          padding: 0.5rem 0;
          border-top: 1px dashed #334155;
          border-bottom: 1px dashed #334155;
        }

        .coupon-tag {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #4ade80;
          font-weight: 600;
        }

        .text-green {
          color: #4ade80;
          font-weight: 700;
        }

        .total-row {
          font-size: 1.4rem;
          font-weight: 800;
          color: #ffffff;
          border-top: 1px solid #334155;
          padding-top: 1rem;
        }

        /* Coupon Form */
        .coupon-form {
          margin-top: 1.5rem;
          border-top: 1px solid #334155;
          padding-top: 1.25rem;
        }

        .coupon-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .coupon-input-group {
          display: flex;
          gap: 0.5rem;
        }

        .input-coupon {
          flex: 1;
          background-color: #0f172a;
          border: 1px solid #334155;
          color: #ffffff;
          padding: 0.6rem 0.75rem;
          border-radius: 6px;
          font-size: 0.95rem;
          outline: none;
        }

        .input-coupon:focus {
          border-color: #3b82f6;
        }

        .btn-apply {
          background-color: #3b82f6;
          color: #ffffff;
          border: none;
          padding: 0.6rem 1.25rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .btn-apply:hover {
          background-color: #2563eb;
        }

        /* Summary Actions */
        .summary-actions {
          margin-top: 1.5rem;
        }

        .btn-clear {
          width: 100%;
          background-color: #ef4444;
          color: #ffffff;
          border: none;
          padding: 0.75rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .btn-clear:hover:not(:disabled) {
          background-color: #dc2626;
        }

        .btn-clear:disabled {
          background-color: #475569;
          color: #94a3b8;
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Help Card */
        .help-card {
          background-color: #f8fafc;
          border-color: #e2e8f0;
        }

        .help-title {
          font-size: 1rem;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 0.75rem;
          color: #334155;
        }

        .help-list {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.85rem;
          color: #475569;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .help-list code {
          background-color: #e2e8f0;
          padding: 0.15rem 0.3rem;
          border-radius: 4px;
          font-family: monospace;
          color: #0f172a;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik Shopping Cart & Coupon Engine",
  meta: [
    {
      name: "description",
      content: "A secure shopping cart and coupon discount engine built with Qwik City",
    },
  ],
};
