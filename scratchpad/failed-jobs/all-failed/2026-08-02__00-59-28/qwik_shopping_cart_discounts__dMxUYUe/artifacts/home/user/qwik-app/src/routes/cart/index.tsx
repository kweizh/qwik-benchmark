import { component$, useSignal } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form } from "@builder.io/qwik-city";
import type { CartState } from "~/lib/cart";
import { getCartState, updateCartItem, applyCoupon, clearCart } from "~/lib/cart";

export const useCartLoader = routeLoader$<CartState>(() => {
  return getCartState();
});

export const useUpdateItem = routeAction$((formData) => {
  const productId = parseInt(formData.productId as string, 10);
  const quantity = parseInt(formData.quantity as string, 10);
  return updateCartItem(productId, quantity);
});

export const useApplyCoupon = routeAction$((formData) => {
  const code = formData.code as string;
  return applyCoupon(code);
});

export const useClearCart = routeAction$(() => {
  return clearCart();
});

export default component$(() => {
  const cartSignal = useCartLoader();
  const updateAction = useUpdateItem();
  const applyAction = useApplyCoupon();
  const clearAction = useClearCart();
  const couponCode = useSignal("");

  return (
    <div class="cart-container">
      <h1>Shopping Cart</h1>

      {cartSignal.value.error && (
        <div class="error-message">{cartSignal.value.error}</div>
      )}

      {cartSignal.value.items.length === 0 ? (
        <p class="empty-cart">Your cart is empty.</p>
      ) : (
        <table class="cart-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cartSignal.value.items.map((item) => (
              <tr key={item.productId}>
                <td>{item.name}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>{item.quantity}</td>
                <td>${item.total.toFixed(2)}</td>
                <td class="action-cell">
                  <Form action={updateAction} spaReset>
                    <input type="hidden" name="productId" value={item.productId} />
                    <div class="quantity-controls">
                      <button
                        type="submit"
                        name="quantity"
                        value={item.quantity - 1}
                        class="qty-btn"
                      >
                        -
                      </button>
                      <span class="qty-display">{item.quantity}</span>
                      <button
                        type="submit"
                        name="quantity"
                        value={item.quantity + 1}
                        class="qty-btn"
                      >
                        +
                      </button>
                    </div>
                  </Form>
                  <Form action={updateAction} spaReset>
                    <input type="hidden" name="productId" value={item.productId} />
                    <input type="hidden" name="quantity" value="0" />
                    <button type="submit" class="remove-btn">
                      Remove
                    </button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div class="cart-summary">
        <div class="summary-row">
          <strong>Subtotal:</strong>
          <span>${cartSignal.value.subtotal.toFixed(2)}</span>
        </div>

        {cartSignal.value.coupon && (
          <div class="summary-row coupon-info">
            <strong>Coupon Applied:</strong>
            <span>
              {cartSignal.value.coupon.code} ({cartSignal.value.coupon.type})
            </span>
          </div>
        )}

        {cartSignal.value.discount > 0 && (
          <div class="summary-row discount-row">
            <strong>Discount:</strong>
            <span>-${cartSignal.value.discount.toFixed(2)}</span>
          </div>
        )}

        <div class="summary-row total-row">
          <strong>Total:</strong>
          <span>${cartSignal.value.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="cart-actions">
        <Form action={applyAction} spaReset class="coupon-form">
          <input
            type="text"
            name="code"
            placeholder="Enter coupon code"
            value={couponCode.value}
            onInput$={(e) => (couponCode.value = (e.target as HTMLInputElement).value)}
            class="coupon-input"
          />
          <button type="submit" class="apply-btn">
            Apply Coupon
          </button>
        </Form>

        <Form action={clearAction} spaReset>
          <button type="submit" class="clear-btn">
            Clear Cart
          </button>
        </Form>
      </div>

      <style>{`
        .cart-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        h1 {
          margin-bottom: 20px;
          color: #333;
        }

        .error-message {
          background: #ffe0e0;
          color: #c00;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 16px;
          border: 1px solid #f5c6cb;
        }

        .empty-cart {
          color: #888;
          font-style: italic;
          padding: 40px 0;
          text-align: center;
        }

        .cart-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }

        .cart-table th {
          background: #f8f9fa;
          padding: 12px 8px;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
          color: #555;
          font-size: 14px;
        }

        .cart-table td {
          padding: 12px 8px;
          border-bottom: 1px solid #eee;
          vertical-align: middle;
        }

        .action-cell {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .qty-btn {
          width: 30px;
          height: 30px;
          border: 1px solid #ccc;
          background: #fff;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .qty-btn:hover {
          background: #f0f0f0;
        }

        .qty-display {
          min-width: 24px;
          text-align: center;
          font-weight: 500;
        }

        .remove-btn {
          padding: 4px 12px;
          border: 1px solid #dc3545;
          background: #fff;
          color: #dc3545;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        }

        .remove-btn:hover {
          background: #dc3545;
          color: #fff;
        }

        .cart-summary {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 16px;
        }

        .coupon-info {
          color: #28a745;
        }

        .discount-row {
          color: #28a745;
        }

        .total-row {
          border-top: 2px solid #dee2e6;
          margin-top: 8px;
          padding-top: 12px;
          font-size: 20px;
          font-weight: 700;
        }

        .cart-actions {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .coupon-form {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .coupon-input {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
          width: 200px;
        }

        .apply-btn {
          padding: 8px 16px;
          background: #007bff;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .apply-btn:hover {
          background: #0056b3;
        }

        .clear-btn {
          padding: 8px 16px;
          background: #6c757d;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .clear-btn:hover {
          background: #545b62;
        }
      `}</style>
    </div>
  );
});
