import { component$, $ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import { listApiKeys, createApiKey, revokeApiKey } from "~/lib/db";

export const useApiKeysLoader = routeLoader$(() => {
  return listApiKeys();
});

export const useCreateKeyAction = routeAction$(async (data) => {
  const name = data.name as string;
  if (!name || name.trim() === "") {
    return { success: false, error: "Name is required" };
  }
  const { row, plainTextKey } = createApiKey(name.trim());
  return {
    success: true,
    key: plainTextKey,
    name: row.name,
    prefix: row.key_prefix,
  };
});

export const useRevokeKeyAction = routeAction$(async (data) => {
  const id = parseInt(data.id as string, 10);
  if (isNaN(id)) {
    return { success: false, error: "Invalid key ID" };
  }
  const success = revokeApiKey(id);
  return { success };
});

export default component$(() => {
  const apiKeys = useApiKeysLoader();
  const createKeyAction = useCreateKeyAction();
  const revokeKeyAction = useRevokeKeyAction();

  const handleCopy = $((keyText: string) => {
    if (keyText) {
      navigator.clipboard.writeText(keyText);
      alert("API Key copied to clipboard!");
    }
  });

  return (
    <div class="container">
      <header class="header">
        <h1>API Key Manager</h1>
        <p>Generate, view, and revoke your API keys to securely authenticate with our developer API.</p>
      </header>

      {/* Prominent success/alert box for newly generated key */}
      {createKeyAction.value?.success && createKeyAction.value.key && (
        <div class="alert alert-success">
          <h3 class="alert-title">API Key Generated Successfully!</h3>
          <p class="alert-message">
            Please copy your API key now. For security reasons, <strong>you will not be able to see it again</strong>.
          </p>
          <div class="key-display-container">
            <span class="key-display">{createKeyAction.value.key}</span>
            <button
              type="button"
              class="copy-btn"
              onClick$={() => handleCopy(createKeyAction.value?.key || "")}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Generate Key Card */}
      <div class="card">
        <h2 class="card-title">Generate New API Key</h2>
        <Form action={createKeyAction}>
          <div class="form-group">
            <label for="key-name">Key Name / Description</label>
            <input
              type="text"
              id="key-name"
              name="name"
              class="input-control"
              placeholder="e.g. Production Mobile App"
              required
            />
          </div>
          {createKeyAction.value?.success === false && (
            <p style={{ color: "var(--danger)", marginBottom: "15px", fontWeight: "bold" }}>
              {createKeyAction.value.error}
            </p>
          )}
          <button type="submit" class="btn btn-primary">
            Generate Key
          </button>
        </Form>
      </div>

      {/* Existing Keys Card */}
      <div class="card">
        <h2 class="card-title">Your API Keys</h2>
        <div class="table-responsive">
          {apiKeys.value.length === 0 ? (
            <div class="no-keys">You haven't generated any API keys yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.value.map((key) => {
                  const dateStr = new Date(key.created_at).toLocaleString();
                  return (
                    <tr key={key.id}>
                      <td style={{ fontWeight: 600 }}>{key.name}</td>
                      <td style={{ fontFamily: "monospace" }}>{key.key_prefix}</td>
                      <td>
                        <span class={`badge ${key.status === "active" ? "badge-active" : "badge-revoked"}`}>
                          {key.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{dateStr}</td>
                      <td>
                        {key.status === "active" ? (
                          <Form action={revokeKeyAction}>
                            <input type="hidden" name="id" value={key.id} />
                            <button type="submit" class="btn btn-danger">
                              Revoke
                            </button>
                          </Form>
                        ) : (
                          <button class="btn" style={{ padding: "8px 16px", fontSize: "0.9rem" }} disabled>
                            Revoked
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "API Key Manager - Developer Dashboard",
  meta: [
    {
      name: "description",
      content: "Manage your developer API keys securely.",
    },
  ],
};
