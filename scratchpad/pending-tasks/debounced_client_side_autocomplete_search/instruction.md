Instant search requires providing real-time feedback without overwhelming the search backend or exposing administrative API keys to the client.

You need to build a Qwik component named `<Autocomplete />` that features a text input. It must use `useTask$` to track the input's value, apply a 300ms debounce, and fetch autocomplete suggestions via a `server$` RPC function.

**Constraints:**
- The Typesense query execution must reside inside the `server$` block to prevent exposing the connection details.
- Implement an `AbortController` cleanup inside `useTask$` to cancel pending debounce timers if the user continues typing.