import { component$ } from "@builder.io/qwik";
import { routeAction$, routeLoader$, zod$, Form } from "@builder.io/qwik-city";
import { createApiKey, listApiKeys, revokeApiKey } from "~/lib/api-keys";

export const useKeysLoader = routeLoader$(() => {
  return listApiKeys();
});

export const useCreateKeyAction = routeAction$(
  (data) => {
    const { record, plainKey } = createApiKey(data.name.trim());
    return {
      success: true as const,
      key: plainKey,
      prefix: record.key_prefix,
      name: record.name,
    };
  },
  zod$((z) => ({
    name: z.string().min(1, "Name is required"),
  })),
);

export const useRevokeKeyAction = routeAction$(
  (data) => {
    const id = Number(data.id);
    const revoked = revokeApiKey(id);
    if (!revoked) {
      return { success: false as const, message: "Key not found" };
    }
    return { success: true as const, message: "Key revoked" };
  },
  zod$((z) => ({
    id: z.string().min(1),
  })),
);

export default component$(() => {
  const keys = useKeysLoader();
  const createAction = useCreateKeyAction();
  const revokeAction = useRevokeKeyAction();

  return (
    <div style={{ maxWidth: "720px", margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>API Key Manager</h1>

      {createAction.value?.success && (
        <div
          style={{
            background: "#e6ffed",
            border: "1px solid #34d058",
            borderRadius: "6px",
            padding: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <strong>New API key created for "{createAction.value.name}"</strong>
          <p>
            Copy this key now — it will <strong>not</strong> be shown again:
          </p>
          <code
            style={{
              display: "block",
              background: "#0d1117",
              color: "#7ee787",
              padding: "0.75rem",
              borderRadius: "4px",
              wordBreak: "break-all",
              fontSize: "1rem",
            }}
          >
            {createAction.value.key}
          </code>
        </div>
      )}

      <section style={{ marginBottom: "2rem" }}>
        <h2>Generate a new key</h2>
        <Form action={createAction} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            name="name"
            placeholder="Key name (e.g. 'My Integration')"
            required
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <button type="submit" style={{ padding: "0.5rem 1rem" }}>
            Generate Key
          </button>
        </Form>
        {createAction.value?.failed && (
          <p style={{ color: "red" }}>
            {createAction.value.fieldErrors?.name ?? "Failed to create key"}
          </p>
        )}
      </section>

      <section>
        <h2>Existing keys</h2>
        {keys.value.length === 0 && <p>No API keys yet.</p>}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cellStyle}>Name</th>
              <th style={cellStyle}>Prefix</th>
              <th style={cellStyle}>Status</th>
              <th style={cellStyle}>Created At</th>
              <th style={cellStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {keys.value.map((k) => (
              <tr key={k.id}>
                <td style={cellStyle}>{k.name}</td>
                <td style={cellStyle}>
                  <code>{k.key_prefix}...</code>
                </td>
                <td style={cellStyle}>
                  <span
                    style={{
                      color: k.status === "active" ? "#1a7f37" : "#cf222e",
                      fontWeight: "bold",
                    }}
                  >
                    {k.status}
                  </span>
                </td>
                <td style={cellStyle}>
                  {new Date(k.created_at).toLocaleString()}
                </td>
                <td style={cellStyle}>
                  {k.status === "active" ? (
                    <Form action={revokeAction}>
                      <input type="hidden" name="id" value={String(k.id)} />
                      <button type="submit">Revoke</button>
                    </Form>
                  ) : (
                    <span>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {revokeAction.value && !revokeAction.value.success && (
          <p style={{ color: "red" }}>{revokeAction.value.message}</p>
        )}
      </section>
    </div>
  );
});

const cellStyle = {
  border: "1px solid #d0d7de",
  padding: "0.5rem",
  textAlign: "left" as const,
};
