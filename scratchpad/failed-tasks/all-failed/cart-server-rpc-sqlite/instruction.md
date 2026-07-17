# Server-Persisted Shopping Cart with Qwik City

## Background
Build a shopping cart web application with Qwik (using Qwik City). The cart's state must live on the **server**, persisted in a **local SQLite database** and keyed by a per-visitor **session id stored in a cookie**. The browser component talks to the server through `server$()` RPC functions and reflects the results reactively. Because the cart is stored server-side, it must survive a full page reload, and two different visitors (different cookies) must have completely independent carts.

## Requirements
- A single page at `/` that renders a fixed product catalog and the current cart contents.
- The visitor can: add a catalog product to the cart, increment/decrement an item's quantity, and remove an item from the cart.
- Every cart read and write must go through `server$()` RPC functions that access a local SQLite database. No cart state may be stored only in the browser.
- Each visitor is identified by a session id kept in an HTTP cookie; the cart rows in SQLite are keyed by that session id. The session id is created on the first write if the cookie is absent.
- The cart must persist across page reloads (loaded from the server on mount), and different sessions must have independent carts.
- The client keeps the cart in a `useStore` and shows a live total derived with `useComputed$`.

## Implementation Hints
- Scaffold a Qwik City app and run its SSR dev server (so `server$()` RPC endpoints work).
- Use `server$()` for the cart operations (add / update quantity / remove / get). Keep **all** SQLite access strictly inside these server boundaries so no server-only module leaks into the client bundle (`better-sqlite3` is a good fit).
- Inside a `server$()` function, the `RequestEvent` is available as `this` (e.g. `this.cookie.get(...)` / `this.cookie.set(...)`). Create the session id on the first write. Load the cart on component mount and keep it in a `useStore`; compute the total with `useComputed$`.
- Project path: /home/user/qwik-app
- Start command: `npm run dev -- --port 3000 --host 0.0.0.0` (must serve the SSR dev server so `server$()` RPC works)
- Port: 3000
- Product catalog (exact ids, names, and prices) that must be rendered and be addable:
  - id `tshirt`, name "Qwik T-Shirt", price 20.00
  - id `stickers`, name "Sticker Pack", price 5.00
  - id `mug`, name "Coffee Mug", price 12.50
- DOM contract (the page is exercised through these attributes; attach them exactly):
  - Catalog "add to cart" button for a product: `data-testid="add-<id>"`
  - A cart line for a product currently in the cart: `data-testid="cart-item-<id>"`
  - The quantity value shown for a cart line: an element with `data-testid="qty-<id>"` whose text is the integer quantity
  - Increment / decrement quantity buttons for a cart line: `data-testid="inc-<id>"` and `data-testid="dec-<id>"`
  - Remove-from-cart button for a cart line: `data-testid="remove-<id>"`
  - Cart total: an element with `data-testid="cart-total"` whose text is the total formatted as `$X.XX` (always two decimals), equal to the sum of price × quantity over all cart lines
  - When the cart has no items, render an element with `data-testid="empty-cart"` and render no `cart-item-*` lines
- Behavior rules: adding a product that is already in the cart must increase that line's quantity instead of creating a duplicate line; the decrement button must not lower a quantity below 1; removing a line deletes it from the server cart.
- The SQLite database must be stored as a local file inside the project directory.

