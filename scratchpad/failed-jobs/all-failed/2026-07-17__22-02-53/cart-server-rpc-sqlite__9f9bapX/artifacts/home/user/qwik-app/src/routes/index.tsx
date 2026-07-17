import { component$, useStore, useVisibleTask$, useComputed$, $ } from "@builder.io/qwik";
import { server$, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getDb } from "../lib/db";
import { randomUUID } from "crypto";

// Product catalog definitions
export const PRODUCTS = [
  { id: "tshirt", name: "Qwik T-Shirt", price: 20.00 },
  { id: "stickers", name: "Sticker Pack", price: 5.00 },
  { id: "mug", name: "Coffee Mug", price: 12.50 },
];

// Loader to get initial cart items during SSR
export const useCartLoader = routeLoader$(async (requestEvent) => {
  const sessionId = requestEvent.cookie.get("session-id")?.value;
  if (!sessionId) {
    return [];
  }
  const db = getDb();
  const items = db
    .prepare("SELECT product_id as id, quantity FROM cart_items WHERE session_id = ?")
    .all(sessionId) as { id: string; quantity: number }[];
  return items;
});

// Server functions (RPC)
export const getCartServer = server$(async function () {
  const sessionId = this.cookie.get("session-id")?.value;
  if (!sessionId) {
    return [];
  }
  const db = getDb();
  const items = db
    .prepare("SELECT product_id as id, quantity FROM cart_items WHERE session_id = ?")
    .all(sessionId) as { id: string; quantity: number }[];
  return items;
});

export const addToCartServer = server$(async function (productId: string) {
  let sessionId = this.cookie.get("session-id")?.value;
  if (!sessionId) {
    sessionId = randomUUID();
    this.cookie.set("session-id", sessionId, { path: "/", httpOnly: true });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT quantity FROM cart_items WHERE session_id = ? AND product_id = ?")
    .get(sessionId, productId) as { quantity: number } | undefined;

  if (row) {
    db.prepare("UPDATE cart_items SET quantity = ? WHERE session_id = ? AND product_id = ?")
      .run(row.quantity + 1, sessionId, productId);
  } else {
    db.prepare("INSERT INTO cart_items (session_id, product_id, quantity) VALUES (?, ?, ?)")
      .run(sessionId, productId, 1);
  }

  const items = db
    .prepare("SELECT product_id as id, quantity FROM cart_items WHERE session_id = ?")
    .all(sessionId) as { id: string; quantity: number }[];
  return items;
});

export const updateQuantityServer = server$(async function (productId: string, quantity: number) {
  let sessionId = this.cookie.get("session-id")?.value;
  if (!sessionId) {
    sessionId = randomUUID();
    this.cookie.set("session-id", sessionId, { path: "/", httpOnly: true });
  }

  if (quantity < 1) {
    quantity = 1;
  }

  const db = getDb();
  const row = db
    .prepare("SELECT quantity FROM cart_items WHERE session_id = ? AND product_id = ?")
    .get(sessionId, productId) as { quantity: number } | undefined;

  if (row) {
    db.prepare("UPDATE cart_items SET quantity = ? WHERE session_id = ? AND product_id = ?")
      .run(quantity, sessionId, productId);
  } else {
    db.prepare("INSERT INTO cart_items (session_id, product_id, quantity) VALUES (?, ?, ?)")
      .run(sessionId, productId, quantity);
  }

  const items = db
    .prepare("SELECT product_id as id, quantity FROM cart_items WHERE session_id = ?")
    .all(sessionId) as { id: string; quantity: number }[];
  return items;
});

export const removeFromCartServer = server$(async function (productId: string) {
  const sessionId = this.cookie.get("session-id")?.value;
  if (!sessionId) {
    return [];
  }

  const db = getDb();
  db.prepare("DELETE FROM cart_items WHERE session_id = ? AND product_id = ?")
    .run(sessionId, productId);

  const items = db
    .prepare("SELECT product_id as id, quantity FROM cart_items WHERE session_id = ?")
    .all(sessionId) as { id: string; quantity: number }[];
  return items;
});

export default component$(() => {
  const initialCart = useCartLoader();
  const cart = useStore<{ items: { id: string; quantity: number }[] }>({
    items: initialCart.value || [],
  });

  // Fetch the latest cart on mount to ensure we are fully in sync
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const items = await getCartServer();
    cart.items = items;
  });

  const total = useComputed$(() => {
    return cart.items.reduce((sum, item) => {
      const product = PRODUCTS.find((p) => p.id === item.id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  });

  const handleAdd = $(async (productId: string) => {
    const updated = await addToCartServer(productId);
    cart.items = updated;
  });

  const handleIncrement = $(async (productId: string) => {
    const item = cart.items.find((i) => i.id === productId);
    if (item) {
      const updated = await updateQuantityServer(productId, item.quantity + 1);
      cart.items = updated;
    }
  });

  const handleDecrement = $(async (productId: string) => {
    const item = cart.items.find((i) => i.id === productId);
    if (item && item.quantity > 1) {
      const updated = await updateQuantityServer(productId, item.quantity - 1);
      cart.items = updated;
    }
  });

  const handleRemove = $(async (productId: string) => {
    const updated = await removeFromCartServer(productId);
    cart.items = updated;
  });

  return (
    <>
      <header class="header">
        <div class="header-content">
          <h1>⚡ Qwik Shop</h1>
          <div>Server-Persisted Shopping Cart</div>
        </div>
      </header>

      <main class="container">
        <div class="grid">
          {/* Product Catalog */}
          <div class="card">
            <h2 class="card-title">Product Catalog</h2>
            <div class="product-list">
              {PRODUCTS.map((product) => (
                <div key={product.id} class="product-card">
                  <div>
                    <div class="product-name">{product.name}</div>
                    <div class="product-price">${product.price.toFixed(2)}</div>
                  </div>
                  <button
                    class="btn btn-primary"
                    data-testid={`add-${product.id}`}
                    onClick$={() => handleAdd(product.id)}
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Shopping Cart */}
          <div class="card">
            <h2 class="card-title">Shopping Cart</h2>
            {cart.items.length === 0 ? (
              <div class="empty-cart-message" data-testid="empty-cart">
                Your cart is empty.
              </div>
            ) : (
              <div>
                {cart.items.map((item) => {
                  const product = PRODUCTS.find((p) => p.id === item.id);
                  if (!product) return null;
                  return (
                    <div
                      key={item.id}
                      class="cart-item"
                      data-testid={`cart-item-${item.id}`}
                    >
                      <div class="cart-item-details">
                        <div class="cart-item-name">{product.name}</div>
                        <div class="cart-item-price">
                          ${product.price.toFixed(2)} each
                        </div>
                      </div>
                      <div class="cart-item-actions">
                        <div class="qty-controls">
                          <button
                            class="qty-btn"
                            data-testid={`dec-${item.id}`}
                            onClick$={() => handleDecrement(item.id)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>
                          <span class="qty-val" data-testid={`qty-${item.id}`}>
                            {item.quantity}
                          </span>
                          <button
                            class="qty-btn"
                            data-testid={`inc-${item.id}`}
                            onClick$={() => handleIncrement(item.id)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          class="btn btn-danger"
                          data-testid={`remove-${item.id}`}
                          onClick$={() => handleRemove(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div class="cart-summary">
                  <div class="cart-total-row">
                    <span>Total:</span>
                    <span data-testid="cart-total">
                      ${total.value.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
});

export const head: DocumentHead = {
  title: "Qwik Shop - Shopping Cart",
  meta: [
    {
      name: "description",
      content: "A beautiful server-persisted shopping cart built with Qwik City",
    },
  ],
};
