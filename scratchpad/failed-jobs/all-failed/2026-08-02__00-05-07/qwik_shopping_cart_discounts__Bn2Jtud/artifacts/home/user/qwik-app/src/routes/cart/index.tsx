import { component$, useStylesScoped$ } from "@builder.io/qwik";
import { routeAction$, routeLoader$, Form } from "@builder.io/qwik-city";
import {
  applyCoupon,
  clearCart,
  getCartState,
  updateCartItemQuantity,
  type CartState,
} from "~/lib/cart";

export const useCartLoader = routeLoader$((): CartState => {
  return getCartState();
});

export const useUpdateQuantityAction = routeAction$(
  (data): CartState => {
    const productId = Number(data.productId);
    const quantity = Number(data.quantity);
    return updateCartItemQuantity(productId, quantity);
  },
);

export const useApplyCouponAction = routeAction$(
  (data): CartState => {
    const code = String(data.code ?? "").trim();
    return applyCoupon(code);
  },
);

export const useClearCartAction = routeAction$((): CartState => {
  return clearCart();
});

export default component$(() => {
  useStylesScoped$(`
    .cart-page {
      max-width: 720px;
      margin: 2rem auto;
      font-family: system-ui, sans-serif;
      padding: 0 1rem;
    }
    .cart-error {
      background: #fdecea;
      color: #b3261e;
      border: 1px solid #f5c6c2;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-weight: 600;
    }
    .cart-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.5rem;
    }
    .cart-table th, .cart-table td {
      text-align: left;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #ddd;
    }
    .inline-form {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .quantity-input {
      width: 4rem;
    }
    .coupon-input {
      width: 12rem;
    }
    .cart-coupon {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: #f7f7f8;
      border-radius: 8px;
    }
    .cart-coupon-active {
      color: #1a7f37;
      font-weight: 600;
    }
    .cart-summary {
      font-size: 1.05rem;
      margin-bottom: 1.5rem;
    }
    .cart-total {
      font-size: 1.3rem;
      font-weight: 700;
    }
    .clear-cart-btn {
      background: #b3261e;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
    }
    button {
      cursor: pointer;
    }
  `);

  const cartSignal = useCartLoader();
  const updateQuantityAction = useUpdateQuantityAction();
  const applyCouponAction = useApplyCouponAction();
  const clearCartAction = useClearCartAction();

  // Prefer the most recent action result (if any) so the page reflects the
  // latest server-computed state immediately after a form submission,
  // falling back to the loader's data on initial render / navigation.
  const cart =
    clearCartAction.value ??
    applyCouponAction.value ??
    updateQuantityAction.value ??
    cartSignal.value;

  const currency = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div class="cart-page">
      <h1>Shopping Cart</h1>

      {cart.error && (
        <div class="cart-error" role="alert">
          {cart.error}
        </div>
      )}

      {cart.items.length === 0 ? (
        <p class="cart-empty">Your cart is empty.</p>
      ) : (
        <table class="cart-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cart.items.map((item) => (
              <tr key={item.productId}>
                <td>{item.name}</td>
                <td>{currency(item.price)}</td>
                <td>
                  <Form action={updateQuantityAction} class="inline-form">
                    <input
                      type="hidden"
                      name="productId"
                      value={String(item.productId)}
                    />
                    <input
                      type="number"
                      name="quantity"
                      min={0}
                      value={String(item.quantity)}
                      class="quantity-input"
                    />
                    <button type="submit">Update</button>
                  </Form>
                </td>
                <td>{currency(item.total)}</td>
                <td>
                  <Form action={updateQuantityAction} class="inline-form">
                    <input
                      type="hidden"
                      name="productId"
                      value={String(item.productId)}
                    />
                    <input type="hidden" name="quantity" value="0" />
                    <button type="submit">Remove</button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div class="cart-coupon">
        <h2>Coupon</h2>
        {cart.coupon ? (
          <p class="cart-coupon-active">
            Applied coupon: <strong>{cart.coupon.code}</strong> (
            {cart.coupon.type}
            {cart.coupon.type === "PERCENT" ? ` ${cart.coupon.value}%` : ""}
            {cart.coupon.type === "FIXED"
              ? ` $${cart.coupon.value.toFixed(2)}`
              : ""}
            )
          </p>
        ) : (
          <p>No coupon applied.</p>
        )}

        <Form action={applyCouponAction} class="inline-form">
          <input
            type="text"
            name="code"
            placeholder="Coupon code"
            class="coupon-input"
          />
          <button type="submit">Apply Coupon</button>
        </Form>
      </div>

      <div class="cart-summary">
        <p>Subtotal: {currency(cart.subtotal)}</p>
        <p>Discount: -{currency(cart.discount)}</p>
        <p class="cart-total">Total: {currency(cart.total)}</p>
      </div>

      <Form action={clearCartAction}>
        <button type="submit" class="clear-cart-btn">
          Clear Cart
        </button>
      </Form>
    </div>
  );
});
