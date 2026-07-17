import {
  component$,
  useStore,
  useComputed$,
  useVisibleTask$,
  $,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { CATALOG } from "~/lib/catalog";
import {
  addToCart,
  getCart,
  removeFromCart,
  updateQuantity,
  type CartLine,
} from "~/lib/cart";

export default component$(() => {
  const cart = useStore<{ lines: CartLine[]; loaded: boolean }>({
    lines: [],
    loaded: false,
  });

  const total = useComputed$(() => {
    return cart.lines.reduce((sum, line) => {
      const product = CATALOG.find((p) => p.id === line.productId);
      return sum + (product ? product.price * line.quantity : 0);
    }, 0);
  });

  // Load the server-persisted cart on mount so it survives full page reloads.
  useVisibleTask$(async () => {
    const lines = await getCart();
    cart.lines = lines;
    cart.loaded = true;
  });

  const handleAdd = $(async (productId: string) => {
    cart.lines = await addToCart(productId);
  });

  const handleInc = $(async (productId: string) => {
    cart.lines = await updateQuantity(productId, 1);
  });

  const handleDec = $(async (productId: string) => {
    cart.lines = await updateQuantity(productId, -1);
  });

  const handleRemove = $(async (productId: string) => {
    cart.lines = await removeFromCart(productId);
  });

  return (
    <>
      <h1>Qwik Shop</h1>

      <section>
        <h2>Catalog</h2>
        <ul class="catalog">
          {CATALOG.map((product) => (
            <li key={product.id} class="catalog-item">
              <span class="name">{product.name}</span>
              <span class="price">${product.price.toFixed(2)}</span>
              <button
                type="button"
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
        {cart.lines.length === 0 ? (
          <div data-testid="empty-cart">Your cart is empty.</div>
        ) : (
          <ul class="cart">
            {cart.lines.map((line) => {
              const product = CATALOG.find((p) => p.id === line.productId);
              return (
                <li
                  key={line.productId}
                  data-testid={`cart-item-${line.productId}`}
                  class="cart-item"
                >
                  <span class="name">{product?.name ?? line.productId}</span>
                  <button
                    type="button"
                    data-testid={`dec-${line.productId}`}
                    onClick$={() => handleDec(line.productId)}
                  >
                    -
                  </button>
                  <span data-testid={`qty-${line.productId}`}>
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    data-testid={`inc-${line.productId}`}
                    onClick$={() => handleInc(line.productId)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    data-testid={`remove-${line.productId}`}
                    onClick$={() => handleRemove(line.productId)}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div data-testid="cart-total">${total.value.toFixed(2)}</div>
      </section>
    </>
  );
});

export const head: DocumentHead = {
  title: "Qwik Shop",
  meta: [
    {
      name: "description",
      content: "Server-persisted shopping cart built with Qwik City.",
    },
  ],
};
