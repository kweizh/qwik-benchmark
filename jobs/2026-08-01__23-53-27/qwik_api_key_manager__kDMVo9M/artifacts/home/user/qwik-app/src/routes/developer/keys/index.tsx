import { component$, useSignal, $ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form } from "@builder.io/qwik-city";
import db, { generateApiKey } from "~/lib/db";

// Load all API keys from the database
export const useGetKeys = routeLoader$(async () => {
  const stmt = db.prepare(`
    SELECT id, name, key_prefix as prefix, status, created_at
    FROM api_keys
    ORDER BY id DESC
  `);
  const rows = stmt.all() as any[];
  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    prefix: row.prefix,
    status: row.status,
    created_at: row.created_at,
  }));
});

// Action to generate a new API key
export const useGenerateKey = routeAction$(async (data) => {
  const name = data.name;
  if (!name || typeof name !== "string" || name.trim() === "") {
    return { success: false, error: "Name is required" };
  }

  const { fullKey, prefix, hashedKey } = generateApiKey();
  const createdAt = new Date().toISOString();
  const status = "active";

  const stmt = db.prepare(`
    INSERT INTO api_keys (name, key_prefix, hashed_key, status, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(name.trim(), prefix, hashedKey, status, createdAt);
  const insertId = info.lastInsertRowid;

  return {
    success: true,
    key: {
      id: Number(insertId),
      name: name.trim(),
      prefix,
      key: fullKey,
      status,
      created_at: createdAt,
    },
  };
});

// Action to revoke an API key
export const useRevokeKey = routeAction$(async (data) => {
  const id = data.id;
  if (!id) {
    return { success: false, error: "ID is required" };
  }

  const checkStmt = db.prepare("SELECT id FROM api_keys WHERE id = ?");
  const keyExists = checkStmt.get(id);

  if (!keyExists) {
    return { success: false, error: "Key not found" };
  }

  const updateStmt = db.prepare("UPDATE api_keys SET status = 'revoked' WHERE id = ?");
  updateStmt.run(id);

  return { success: true };
});

export default component$(() => {
  const keysSignal = useGetKeys();
  const generateAction = useGenerateKey();
  const revokeAction = useRevokeKey();

  const isCopied = useSignal(false);

  const handleCopy = $(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      isCopied.value = true;
      setTimeout(() => {
        isCopied.value = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy key: ", err);
    }
  });

  const generatedKey = generateAction.value?.key;

  return (
    <div class="container">
      <header>
        <h1>API Key Manager</h1>
        <p class="subtitle">Generate, view, and revoke API keys for your applications.</p>
      </header>

      {/* Prominent success/alert box for newly generated key */}
      {generateAction.value?.success && generatedKey && (
        <div class="alert alert-success">
          <h3>🎉 API Key Generated Successfully!</h3>
          <p>
            Please copy this key and store it somewhere secure. For security reasons,{" "}
            <strong>you will not be able to see it again.</strong>
          </p>
          <div class="key-display">
            <span>{generatedKey.key}</span>
            <button
              type="button"
              class="btn-primary"
              style="padding: 0.25rem 0.75rem; font-size: 0.875rem;"
              onClick$={() => handleCopy(generatedKey.key)}
            >
              {isCopied.value ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {generateAction.value?.success === false && (
        <div class="alert" style="background-color: var(--danger-bg); border-color: var(--danger-border); color: var(--danger-text);">
          <strong>Error:</strong> {generateAction.value.error}
        </div>
      )}

      {/* Generate Key Form */}
      <div class="card">
        <h2 class="card-title">Generate a New API Key</h2>
        <Form action={generateAction}>
          <div class="form-group">
            <label for="key-name">Key Name / Description</label>
            <div class="input-row">
              <input
                type="text"
                id="key-name"
                name="name"
                placeholder="e.g. Production Frontend, Development Key"
                required
                value={generateAction.value?.success ? "" : undefined}
              />
              <button type="submit" class="btn-primary">
                {generateAction.isRunning ? "Generating..." : "Generate Key"}
              </button>
            </div>
          </div>
        </Form>
      </div>

      {/* Keys Table */}
      <div class="card" style="padding: 0; overflow-x: auto;">
        <h2 class="card-title" style="padding: 1.5rem 1.5rem 0 1.5rem; margin-bottom: 0.5rem;">
          Your API Keys
        </h2>
        {keysSignal.value.length === 0 ? (
          <p style="padding: 0 1.5rem 1.5rem 1.5rem; color: var(--text-muted);">
            No API keys generated yet. Create one above to get started.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Prefix</th>
                <th>Status</th>
                <th>Created At</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keysSignal.value.map((key) => (
                <tr key={key.id}>
                  <td style="font-weight: 500;">{key.name}</td>
                  <td>
                    <span class="monospace">{key.prefix}</span>
                  </td>
                  <td>
                    <span class={`badge badge-${key.status}`}>{key.status}</span>
                  </td>
                  <td class="text-muted">
                    {new Date(key.created_at).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td style="text-align: right;">
                    <Form action={revokeAction}>
                      <input type="hidden" name="id" value={key.id} />
                      <button
                        type="submit"
                        class="btn-danger"
                        disabled={key.status === "revoked" || revokeAction.isRunning}
                      >
                        {revokeAction.isRunning && revokeAction.formData?.get("id") === String(key.id)
                          ? "Revoking..."
                          : "Revoke"}
                      </button>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});
