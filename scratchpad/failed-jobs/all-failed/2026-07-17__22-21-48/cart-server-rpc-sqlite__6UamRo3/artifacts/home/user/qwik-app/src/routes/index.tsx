import { component$, useComputed$, useStore } from "@builder.io/qwik";
import {
  routeLoader$,
  server$,
  type DocumentHead,
  type RequestEventLoader,
} from "@builder.io/qwik-city";
import {
  PRODUCTS,
  PRODUCT_MAP,
  formatPrice,
  type CartItem,
} from "../catalog";
import { SESSION_COOKIE, ensureSession } from "../server/session";

/**
 * Loads the visitor's cart from SQLite during SSR so the page renders with the
 * persisted cart and survives a full reload. This is a read: it does NOT create
 * a session if the cookie is absent.
 */
export const useCart = routeLoader$(async (event: RequestEventLoader) => {
  const sessionId = event.cookie.get(SESSION_COOKIE);
  if (!sessionId) return [];
  const { getCart } = await import("../server/db");
  return getCart(sessionId);
});

/**
 * Read the cart for the current session (no session is created on read).
 */
const getCartServer = server$(async function (): Promise<CartItem[]> {
  const sessionId = this.cookie.get(SESSION_COOKIE);
  if (!sessionId) return [];
  const { getCart } = await import("../server/db");
  return getCart(sessionId);
});

/**
 * Add a product to the cart. Creates the session cookie on this first write.
 * Returns the full, refreshed cart so the client can update its store in one
 * round trip.
 */
const addToCart = server$(async function (productId: string): Promise<CartItem[]> {
  const sid = await ensureSession(this);
  const { addItem, getCart } = await import("../server/db");
  addItem(sid, productId);
  return getCart(sid);
});

/**
 * Increment (+1) or decrement (-1) a cart line's quantity. The quantity is
 * clamped to a minimum of 1 on the server.
 */
const updateQtyServer = server$(
  async function (productId: string, delta: number): Promise<CartItem[]> {
    const sid = await ensureSession(this);
    const { updateQty, getCart } = await import("../server/db");
    updateQty(sid, productId, delta);
    return getCart(sid);
  },
);

/**
 * Remove a product line entirely from the cart.
 */
const removeFromCartServer = server$(
  async function (productId: string): Promise<CartItem[]> {
    const sid = await ensureSession(this);
    const { removeItem, getCart } = await import("../server/db");
    removeItem(sid, productId);
    return getCart(sid);
  },
);

export default component$(() => {
  // Initial cart comes from the server (routeLoader) during SSR.
  const initialCart = useCart();

  // The cart lives in a useStore; mutations replace its `items` array.
  const cart = useStore<{ items: CartItem[] }>({ items: initialCart.value });

  // Live total derived reactively from the store.
  const total = useComputed$(() => {
    const dollars = cart.items.reduce((sum, item) => {
      const product = PRODUCT_MAP[item.productId];
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    return formatPrice(dollars);
  });

  const refresh = $(async (result: CartItem[]) => {
    cart.items = result;
  });

  const handleAdd = $(async (productId: string) => {
    refresh(await addToCart(productId));
  });

  const handleUpdateQty = $(async (productId: string, delta: number) => {
    refresh(await updateQtyServer(productId, delta));
  });

  const handleRemove = $(async (productId: string) => {
    refresh(await removeFromCartServer(productId));
  });

  return (
    <main style={{ "max-width": "720px", margin: "0 auto", padding: "1rem" }}>
      <h1>Qwik Store</h1>

      <section>
        <h2>Products</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {PRODUCTS.map((product) => (
            <li
              key={product.id}
              style={{
                display: "flex",
                "justify-content": "space-between",
                alignItems: "center",
                padding: "0.5rem 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <span>
                {product.name} — {formatPrice(product.price)}
              </span>
              <button
                data-testid={`add-${product.id}`}
                onClick$={() => handleAdd(product.id)}
              >
                Add to cart
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Cart</h2>

        {cart.items.length === 0 ? (
          <p data-testid="empty-cart">Your cart is empty.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {cart.items.map((item) => {
              const product = PRODUCT_MAP[item.productId];
              return (
                <li
                  key={item.productId}
                  data-testid={`cart-item-${item.productId}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <span style={{ flex: 1 }}>
                    {product ? product.name : item.productId} —{" "}
                    {product ? formatPrice(product.price) : ""}
                  </span>
                  <button
                    data-testid={`dec-${item.productId}`}
                    onClick$={() => handleUpdateQty(item.productId, -1)}
                    aria-label={`Decrease ${item.productId} quantity`}
                  >
                    −
                  </button>
                  <span data-testid={`qty-${item.productId}`}>{item.quantity}</span>
                  <button
                    data-testid={`inc-${item.productId}`}
                    onClick$={() => handleUpdateQty(item.productId, 1)}
                    aria-label={`Increase ${item.productId} quantity`}
                  >
                    +
                  </button>
                  <button
                    data-testid={`remove-${item.productId}`}
                    onClick$={() => handleRemove(item.productId)}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p>
          Total: <span data-testid="cart-total">{total.value}</span>
        </p>
      </section>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Qwik Store",
  meta: [
    {
      name: "description",
      content: "Server-persisted shopping cart built with Qwik City.",
    },
  ],
};

