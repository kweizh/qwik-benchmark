import { $, component$, useSignal } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getCartState, getAllProducts, type CartState } from "../../db";

// Load the initial cart state on the server
export const useCartStateLoader = routeLoader$(() => {
  return getCartState();
});

// Load all available products on the server
export const useProductsLoader = routeLoader$(() => {
  return getAllProducts();
});

export default component$(() => {
  const cartStateLoader = useCartStateLoader();
  const productsLoader = useProductsLoader();

  // Reactive signal to store the current cart state, initialized with loader data
  const stateSignal = useSignal<CartState>(cartStateLoader.value);
  const couponInputSignal = useSignal("");

  // Helper to call API and update local state
  const mutateCart = $(async (action: string, payload: Record<string, any>) => {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, ...payload }),
      });
      if (res.ok) {
        const newState = await res.json();
        stateSignal.value = newState;
      }
    } catch (err) {
      console.error("Failed to mutate cart:", err);
    }
  });

  const handleUpdateQuantity = $(async (productId: number, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    await mutateCart("update", { productId, quantity: newQty });
  });

  const handleApplyCoupon = $(async () => {
    const code = couponInputSignal.value.trim();
    if (!code) return;
    await mutateCart("applyCoupon", { code });
    couponInputSignal.value = "";
  });

  const handleClearCart = $(async () => {
    await mutateCart("clear", {});
  });

  const handleAddProduct = $(async (productId: number) => {
    const existing = stateSignal.value.items.find((item) => item.productId === productId);
    const qty = existing ? existing.quantity + 1 : 1;
    await mutateCart("update", { productId, quantity: qty });
  });

  return (
    <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Tailwind CSS CDN */}
      <link
        href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
        rel="stylesheet"
      />

      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            Qwik Shopping Cart
          </h1>
          <p class="mt-4 text-lg text-gray-500">
            With Server-Side Coupon & Discount Rule Engine
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Cart Items & Product Catalog */}
          <div class="lg:col-span-2 space-y-8">
            {/* Cart Items List */}
            <div class="bg-white rounded-xl shadow-md p-6">
              <h2 class="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-100">
                Shopping Cart ({stateSignal.value.items.reduce((sum, i) => sum + i.quantity, 0)} items)
              </h2>

              {stateSignal.value.items.length === 0 ? (
                <div class="text-center py-12">
                  <svg
                    class="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  <p class="mt-4 text-gray-500 text-lg">Your cart is empty.</p>
                  <p class="text-sm text-gray-400 mt-1">Add some products from the catalog below.</p>
                </div>
              ) : (
                <div class="divide-y divide-gray-100">
                  {stateSignal.value.items.map((item) => (
                    <div key={item.productId} class="py-4 flex items-center justify-between">
                      <div class="flex-1 min-w-0 pr-4">
                        <h3 class="text-lg font-semibold text-gray-900 truncate">{item.name}</h3>
                        <p class="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
                      </div>

                      <div class="flex items-center space-x-4">
                        {/* Quantity Controls */}
                        <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                          <button
                            onClick$={() => handleUpdateQuantity(item.productId, item.quantity, -1)}
                            class="px-3 py-1 text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition font-bold"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span class="px-4 py-1 text-gray-800 font-medium bg-white border-x border-gray-200 min-w-[3rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick$={() => handleUpdateQuantity(item.productId, item.quantity, 1)}
                            class="px-3 py-1 text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition font-bold"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        {/* Item Total */}
                        <div class="text-right min-w-[5rem]">
                          <span class="text-lg font-bold text-gray-900">
                            ${item.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Catalog */}
            <div class="bg-white rounded-xl shadow-md p-6">
              <h2 class="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-100">
                Product Catalog
              </h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {productsLoader.value.map((product) => {
                  const inCartQty =
                    stateSignal.value.items.find((i) => i.productId === product.id)?.quantity || 0;
                  return (
                    <div
                      key={product.id}
                      class="border border-gray-100 rounded-xl p-4 flex flex-col justify-between hover:border-blue-100 hover:shadow-sm transition"
                    >
                      <div>
                        <h3 class="text-lg font-bold text-gray-800">{product.name}</h3>
                        <p class="text-xl font-extrabold text-blue-600 mt-1">
                          ${product.price.toFixed(2)}
                        </p>
                      </div>
                      <div class="mt-4 flex items-center justify-between">
                        <span class="text-xs text-gray-400">
                          {inCartQty > 0 ? `${inCartQty} in cart` : "Not in cart"}
                        </span>
                        <button
                          onClick$={() => handleAddProduct(product.id)}
                          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition active:scale-95"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Summary & Coupons */}
          <div class="space-y-8">
            {/* Error Banner */}
            {stateSignal.value.error && (
              <div class="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4 shadow-sm animate-pulse">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <svg
                      class="h-5 w-5 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-bold text-red-800">
                      Error: {stateSignal.value.error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Summary Card */}
            <div class="bg-white rounded-xl shadow-md p-6 space-y-6">
              <h2 class="text-2xl font-bold text-gray-800 pb-2 border-b border-gray-100">
                Order Summary
              </h2>

              <div class="space-y-4">
                <div class="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span class="font-semibold">${stateSignal.value.subtotal.toFixed(2)}</span>
                </div>

                {stateSignal.value.coupon && (
                  <div class="flex justify-between items-center bg-green-50 text-green-800 px-3 py-2 rounded-lg">
                    <div class="flex items-center space-x-2">
                      <svg
                        class="h-4 w-4 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span class="font-bold text-sm">
                        {stateSignal.value.coupon.code} ({stateSignal.value.coupon.type})
                      </span>
                    </div>
                    <span class="text-xs text-green-600 font-medium">
                      {stateSignal.value.coupon.type === "PERCENT" && `${stateSignal.value.coupon.value}% off`}
                      {stateSignal.value.coupon.type === "FIXED" && `$${stateSignal.value.coupon.value.toFixed(2)} off`}
                      {stateSignal.value.coupon.type === "BOGO" && `BOGO (P.ID ${stateSignal.value.coupon.value})`}
                    </span>
                  </div>
                )}

                <div class="flex justify-between text-green-600 font-medium">
                  <span>Discount</span>
                  <span>-${stateSignal.value.discount.toFixed(2)}</span>
                </div>

                <div class="border-t border-gray-100 pt-4 flex justify-between text-gray-900">
                  <span class="text-lg font-bold">Total</span>
                  <span class="text-2xl font-extrabold text-blue-600">
                    ${stateSignal.value.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div class="pt-4">
                <button
                  onClick$={handleClearCart}
                  class="w-full py-3 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 font-bold rounded-xl transition duration-150 shadow-sm"
                >
                  Clear Cart
                </button>
              </div>
            </div>

            {/* Apply Coupon Card */}
            <div class="bg-white rounded-xl shadow-md p-6 space-y-4">
              <h3 class="text-lg font-bold text-gray-800">Promo Code</h3>
              <p class="text-xs text-gray-400">
                Try codes: <code class="bg-gray-100 px-1 rounded">SAVE10</code>,{" "}
                <code class="bg-gray-100 px-1 rounded">SAVE20_MIN50</code>,{" "}
                <code class="bg-gray-100 px-1 rounded">FLAT15</code>,{" "}
                <code class="bg-gray-100 px-1 rounded">BOGO2</code>
              </p>
              <div class="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  bind:value={couponInputSignal}
                  class="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick$={handleApplyCoupon}
                  class="bg-gray-900 hover:bg-gray-800 active:bg-black text-white px-6 py-3 text-sm font-bold rounded-xl transition duration-150 shadow-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik Shopping Cart with Coupon Engine",
  meta: [
    {
      name: "description",
      content: "Shopping Cart with coupon rules calculating server-side in SQLite",
    },
  ],
};
