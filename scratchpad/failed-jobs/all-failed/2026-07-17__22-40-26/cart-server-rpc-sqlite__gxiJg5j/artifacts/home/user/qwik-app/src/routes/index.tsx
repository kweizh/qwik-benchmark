import {
  $,
  component$,
  useComputed$,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { server$, type DocumentHead } from "@builder.io/qwik-city";
import {
  PRODUCT_BY_ID,
  PRODUCTS,
  SESSION_COOKIE,
  addItem,
  getOrCreateSessionId,
  loadCart,
  removeItem,
  updateQuantity,
  type CartLine,
} from "~/server/db";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const getCart = server$(function (): CartLine[] {
  const existing = this.cookie.get(SESSION_COOKIE)?.value;
  if (!existing) return [];
  return loadCart(existing);
});

const addToCart = server$(function (productId: string): CartLine[] {
  if (!PRODUCT_BY_ID[productId]) {
    throw new Error(`Unknown product: ${productId}`);
  }
  const existing = this.cookie.get(SESSION_COOKIE)?.value;
  const sessionId = getOrCreateSessionId(existing);
  if (!existing) {
    this.cookie.set(SESSION_COOKIE, sessionId, {
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
      httpOnly: false,
      sameSite: "lax",
    });
  }
  return addItem(sessionId, productId);
});

const changeQuantity = server$(function (
  productId: string,
  delta: number,
): CartLine[] {
  const existing = this.cookie.get(SESSION_COOKIE)?.value;
  if (!existing) return [];
  if (!PRODUCT_BY_ID[productId]) {
    throw new Error(`Unknown product: ${productId}`);
  }
  return updateQuantity(existing, productId, delta);
});

const removeFromCart = server$(function (productId: string): CartLine[] {
  const existing = this.cookie.get(SESSION_COOKIE)?.value;
  if (!existing) return [];
  if (!PRODUCT_BY_ID[productId]) {
    throw new Error(`Unknown product: ${productId}`);
  }
  return removeItem(existing, productId);
});

interface CartStore {
  items: CartLine[];
}

export default component$(() => {
  const cart = useStore<CartStore>({ items: [] });

  const total = useComputed$(() => {
    let sum = 0;
    for (const item of cart.items) {
      const product = PRODUCT_BY_ID[item.productId];
      if (product) sum += product.price * item.quantity;
    }
    return sum;
  });

  // Load the cart from the server when the component mounts in the browser.
  // useVisibleTask$ only runs on the client, which guarantees the RPC fires
  // and reflects the persisted cart from the SQLite-backed server.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    cart.items = await getCart();
  });

  const onAdd = $(async (productId: string) => {
    cart.items = await addToCart(productId);
  });

  const onIncrement = $(async (productId: string) => {
    cart.items = await changeQuantity(productId, 1);
  });

  const onDecrement = $(async (productId: string) => {
    cart.items = await changeQuantity(productId, -1);
  });

  const onRemove = $(async (productId: string) => {
    cart.items = await removeFromCart(productId);
  });

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
        maxWidth: "720px",
        margin: "0 auto",
      }}
    >
      <h1>Qwik Shop</h1>

      <section>
        <h2>Catalog</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {PRODUCTS.map((product) => (
            <li
              key={product.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <span>
                {product.name} — ${product.price.toFixed(2)}
              </span>
              <button
                type="button"
                data-testid={`add-${product.id}`}
                onClick$={() => onAdd(product.id)}
              >
                Add to cart
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Cart</h2>
        {cart.items.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {cart.items.map((item) => {
              const product = PRODUCT_BY_ID[item.productId];
              if (!product) return null;
              return (
                <li
                  key={item.productId}
                  data-testid={`cart-item-${item.productId}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <span>{product.name}</span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <button
                      type="button"
                      data-testid={`dec-${item.productId}`}
                      onClick$={() => onDecrement(item.productId)}
                    >
                      −
                    </button>
                    <span data-testid={`qty-${item.productId}`}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      data-testid={`inc-${item.productId}`}
                      onClick$={() => onIncrement(item.productId)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      data-testid={`remove-${item.productId}`}
                      onClick$={() => onRemove(item.productId)}
                      style={{ marginLeft: "0.75rem" }}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p data-testid="empty-cart">Your cart is empty.</p>
        )}
        <p style={{ marginTop: "1rem", fontWeight: "bold" }}>
          Total:{" "}
          <span data-testid="cart-total">${total.value.toFixed(2)}</span>
        </p>
      </section>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Qwik Shop",
  meta: [
    {
      name: "description",
      content: "Server-persisted shopping cart demo",
    },
  ],
};