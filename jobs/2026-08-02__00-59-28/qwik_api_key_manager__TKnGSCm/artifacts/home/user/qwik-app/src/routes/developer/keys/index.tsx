import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { routeLoader$, Form, routeAction$ } from "@builder.io/qwik-city";
import { getDb } from "~/lib/db";
import { generateApiKey, getKeyPrefix, hashKey } from "~/lib/crypto";

export interface KeyInfo {
  id: number;
  name: string;
  prefix: string;
  status: string;
  created_at: string;
}

/**
 * Server-side loader: fetches all keys from the database.
 */
export const useKeys = routeLoader$(async () => {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, name, key_prefix, status, created_at FROM api_keys ORDER BY id DESC")
    .all() as Array<{
    id: number;
    name: string;
    key_prefix: string;
    status: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    prefix: row.key_prefix,
    status: row.status,
    created_at: row.created_at,
  })) as KeyInfo[];
});

/**
 * Server-side action: generates a new API key.
 */
export const useCreateKey = routeAction$(async (data) => {
  const name = (data.name as string)?.trim();
  if (!name) {
    return { success: false, error: "Name is required" };
  }

  const plainKey = generateApiKey();
  const prefix = getKeyPrefix(plainKey);
  const hashed = hashKey(plainKey);
  const createdAt = new Date().toISOString();

  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO api_keys (name, key_prefix, hashed_key, status, created_at) VALUES (?, ?, ?, 'active', ?)"
  );
  const result = stmt.run(name, prefix, hashed, createdAt);

  return {
    success: true,
    key: {
      id: result.lastInsertRowid as number,
      name,
      prefix,
      key: plainKey,
      status: "active",
      created_at: createdAt,
    },
  };
});

/**
 * Server-side action: revokes an API key.
 */
export const useRevokeKey = routeAction$(async (data) => {
  const id = parseInt(data.id as string, 10);
  if (isNaN(id)) {
    return { success: false, error: "Invalid key ID" };
  }

  const db = getDb();
  const key = db.prepare("SELECT id FROM api_keys WHERE id = ?").get(id) as
    | { id: number }
    | undefined;

  if (!key) {
    return { success: false, error: "Key not found" };
  }

  db.prepare("UPDATE api_keys SET status = 'revoked' WHERE id = ?").run(id);

  return { success: true, message: `API key '${id}' has been revoked successfully` };
});

export default component$(() => {
  const keysSignal = useKeys();
  const createAction = useCreateKey();
  const revokeAction = useRevokeKey();
  const newKeyInfo = useSignal<{
    name: string;
    key: string;
    prefix: string;
  } | null>(null);

  // Show the new key info when createAction completes
  useVisibleTask$(({ track }) => {
    track(() => createAction.value);
    if (createAction.value?.success && createAction.value.key) {
      const k = createAction.value.key;
      newKeyInfo.value = {
        name: k.name,
        key: k.key,
        prefix: k.prefix,
      };
    }
  });

  const dismissKeyInfo = $(() => {
    newKeyInfo.value = null;
  });

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>API Key Manager</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Generate, view, and manage your API keys for programmatic access.
      </p>

      {/* New Key Success Alert */}
      {newKeyInfo.value && (
        <div
          style={{
            background: "#e6ffed",
            border: "2px solid #34d058",
            borderRadius: "8px",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#22863a" }}>
                ✅ API Key Created Successfully!
              </h3>
              <p style={{ margin: "0 0 0.25rem 0", color: "#586069" }}>
                <strong>Name:</strong> {newKeyInfo.value.name}
              </p>
              <p style={{ margin: "0 0 0.25rem 0", color: "#586069" }}>
                <strong>Prefix:</strong> {newKeyInfo.value.prefix}
              </p>
              <p style={{ margin: "0.5rem 0 0.25rem 0", color: "#586069" }}>
                <strong>Your API Key (copy it now — it won't be shown again):</strong>
              </p>
              <code
                style={{
                  display: "inline-block",
                  background: "#fff",
                  border: "1px solid #34d058",
                  borderRadius: "4px",
                  padding: "0.5rem 1rem",
                  fontSize: "1rem",
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                  marginTop: "0.25rem",
                }}
              >
                {newKeyInfo.value.key}
              </code>
            </div>
            <button
              onClick$={dismissKeyInfo}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#586069",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Create Key Form */}
      <div
        style={{
          background: "#f6f8fa",
          border: "1px solid #d0d7de",
          borderRadius: "8px",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.2rem" }}>Generate New API Key</h2>
        <Form action={createAction} spaReset>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "1", minWidth: "200px" }}>
              <label
                for="name"
                style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.9rem" }}
              >
                Key Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., Production API Key"
                required
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #d0d7de",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                background: "#0969da",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "0.5rem 1.25rem",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              disabled={createAction.isRunning}
            >
              {createAction.isRunning ? "Generating..." : "Generate Key"}
            </button>
          </div>
          {createAction.value && !createAction.value.success && (
            <p style={{ color: "#cf222e", marginTop: "0.75rem", marginBottom: 0 }}>
              {createAction.value.error}
            </p>
          )}
        </Form>
      </div>

      {/* Keys Table */}
      <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Your API Keys</h2>

      {keysSignal.value.length === 0 ? (
        <p style={{ color: "#666", fontStyle: "italic" }}>
          No API keys yet. Generate your first key above.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #d0d7de",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ background: "#f6f8fa" }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Prefix</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created At</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keysSignal.value.map((key) => (
                <tr key={key.id} style={{ borderTop: "1px solid #d0d7de" }}>
                  <td style={tdStyle}>{key.id}</td>
                  <td style={tdStyle}>{key.name}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace" }}>{key.prefix}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.15rem 0.6rem",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        background: key.status === "active" ? "#dafbe1" : "#ffebe9",
                        color: key.status === "active" ? "#1a7f37" : "#cf222e",
                      }}
                    >
                      {key.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: "0.85rem" }}>
                    {new Date(key.created_at).toLocaleString()}
                  </td>
                  <td style={tdStyle}>
                    {key.status === "active" && (
                      <Form action={revokeAction} spaReset>
                        <input type="hidden" name="id" value={key.id} />
                        <button
                          type="submit"
                          style={{
                            background: "#cf222e",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.3rem 0.75rem",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          disabled={revokeAction.isRunning}
                        >
                          Revoke
                        </button>
                      </Form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

const thStyle: Record<string, string | number> = {
  padding: "0.75rem 1rem",
  textAlign: "left",
  fontWeight: 600,
  fontSize: "0.85rem",
  borderBottom: "2px solid #d0d7de",
};

const tdStyle: Record<string, string> = {
  padding: "0.75rem 1rem",
  verticalAlign: "middle",
};
