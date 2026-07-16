Qwik achieves resumability by serializing component state to JSON in the HTML. Placing active class instances, like a database client, into reactive state causes runtime crashes.

You need to debug and fix a crashing Qwik component that attempts to store an active `Typesense.Client` instance directly inside a `useStore` object. The error presented is: "Only primitive and object literals can be serialized".

**Constraints:**
- Do NOT remove the `useStore` implementation.
- You must wrap the `Typesense.Client` instantiation with Qwik's `noSerialize()` function before assigning it to the store property.
- Ensure TypeScript correctly types the store property as potentially `undefined` upon client resumption.