import { component$, useSignal } from '@builder.io/qwik';
import { routeLoader$, routeAction$, Form } from '@builder.io/qwik-city';
import db, { generateApiKey, hashApiKey } from '../../../lib/db';

export const useKeysLoader = routeLoader$(() => {
  try {
    const stmt = db.prepare(`
      SELECT id, name, key_prefix AS prefix, status, created_at
      FROM api_keys
      ORDER BY id DESC
    `);
    return stmt.all() as {
      id: number;
      name: string;
      prefix: string;
      status: 'active' | 'revoked';
      created_at: string;
    }[];
  } catch (error) {
    console.error('Error loading keys:', error);
    return [];
  }
});

export const useGenerateAction = routeAction$(async (data) => {
  try {
    const name = (data.name as string || '').trim();
    if (!name) {
      return { success: false, error: 'Name is required' };
    }

    const plainTextKey = generateApiKey();
    const keyPrefix = plainTextKey.slice(0, 7);
    const hashedKey = hashApiKey(plainTextKey);
    const createdAt = new Date().toISOString();
    const statusVal = 'active';

    const stmt = db.prepare(`
      INSERT INTO api_keys (name, key_prefix, hashed_key, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, keyPrefix, hashedKey, statusVal, createdAt);
    const id = Number(info.lastInsertRowid);

    return {
      success: true,
      key: plainTextKey,
      name,
      prefix: keyPrefix,
      id,
      created_at: createdAt
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to generate key' };
  }
});

export const useRevokeAction = routeAction$(async (data) => {
  try {
    const id = Number(data.id);
    if (isNaN(id)) {
      return { success: false, error: 'Invalid key ID' };
    }

    const stmt = db.prepare(`
      UPDATE api_keys
      SET status = 'revoked'
      WHERE id = ?
    `);
    stmt.run(id);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to revoke key' };
  }
});

export default component$(() => {
  const keys = useKeysLoader();
  const generateAction = useGenerateAction();
  const revokeAction = useRevokeAction();
  const keyName = useSignal('');

  return (
    <div class="container">
      <header class="header">
        <h1>API Key Manager</h1>
        <p class="subtitle">Securely manage API keys for your applications</p>
      </header>

      {/* Success alert with the plain text key (Only shown once after generation) */}
      {generateAction.value?.success && generateAction.value?.key && (
        <div class="alert alert-success">
          <div class="alert-header">
            <span class="alert-icon">⚠️</span>
            <strong>API Key Generated Successfully!</strong>
          </div>
          <p class="alert-desc">
            Please copy this key now. For security reasons, <strong>it will not be shown again</strong>.
          </p>
          <div class="key-display-container">
            <code class="key-code" id="generated-key">
              {generateAction.value.key}
            </code>
            <button
              type="button"
              class="btn btn-copy"
              onClick$={() => {
                const keyText = document.getElementById('generated-key')?.textContent;
                if (keyText) {
                  navigator.clipboard.writeText(keyText);
                  alert('API Key copied to clipboard!');
                }
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Error messages */}
      {generateAction.value?.success === false && (
        <div class="alert alert-danger">
          <strong>Error:</strong> {generateAction.value.error}
        </div>
      )}

      {revokeAction.value?.success === false && (
        <div class="alert alert-danger">
          <strong>Error:</strong> {revokeAction.value.error}
        </div>
      )}

      <div class="grid">
        {/* Create Key Card */}
        <section class="card">
          <h2 class="card-title">Generate New API Key</h2>
          <Form
            action={generateAction}
            onSubmit$={() => {
              keyName.value = '';
            }}
          >
            <div class="form-group">
              <label for="name">Key Name / Description</label>
              <input
                type="text"
                id="name"
                name="name"
                value={keyName.value}
                onInput$={(ev) => (keyName.value = (ev.target as HTMLInputElement).value)}
                placeholder="e.g. Production Frontend, Analytics Service"
                required
                class="form-control"
              />
            </div>
            <button type="submit" class="btn btn-primary" disabled={generateAction.isRunning}>
              {generateAction.isRunning ? 'Generating...' : 'Generate Key'}
            </button>
          </Form>
        </section>

        {/* Existing Keys Card */}
        <section class="card col-span-2">
          <h2 class="card-title">Your API Keys</h2>
          {keys.value.length === 0 ? (
            <p class="empty-state">No API keys generated yet.</p>
          ) : (
            <div class="table-responsive">
              <table class="table">
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
                  {keys.value.map((key) => (
                    <tr key={key.id}>
                      <td class="font-semibold">{key.name}</td>
                      <td>
                        <code class="prefix-code">{key.prefix}</code>
                      </td>
                      <td>
                        <span class={`badge badge-${key.status}`}>
                          {key.status.toUpperCase()}
                        </span>
                      </td>
                      <td class="text-muted">
                        {new Date(key.created_at).toLocaleString()}
                      </td>
                      <td>
                        {key.status === 'active' ? (
                          <Form action={revokeAction}>
                            <input type="hidden" name="id" value={key.id} />
                            <button
                              type="submit"
                              class="btn btn-danger-outline"
                              disabled={revokeAction.isRunning}
                            >
                              Revoke
                            </button>
                          </Form>
                        ) : (
                          <span class="text-revoked">Revoked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          color: #1a202c;
        }
        .header {
          margin-bottom: 2.5rem;
          text-align: center;
        }
        .header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          color: #111827;
          margin-bottom: 0.5rem;
        }
        .subtitle {
          font-size: 1.1rem;
          color: #4b5563;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 768px) {
          .grid {
            grid-template-columns: 1fr 2fr;
          }
        }
        .card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          padding: 1.5rem;
        }
        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 0.75rem;
        }
        .form-group {
          margin-bottom: 1.25rem;
        }
        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }
        .form-control {
          width: 100%;
          padding: 0.75rem;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          font-size: 0.95rem;
          box-sizing: border-box;
          transition: border-color 0.15s ease-in-out;
        }
        .form-control:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.25rem;
          font-size: 0.95rem;
          font-weight: 600;
          border-radius: 6px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          width: 100%;
        }
        .btn-primary {
          background-color: #2563eb;
          color: white;
        }
        .btn-primary:hover {
          background-color: #1d4ed8;
        }
        .btn-primary:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        .btn-danger-outline {
          background-color: transparent;
          color: #dc2626;
          border-color: #fca5a5;
          padding: 0.4rem 0.8rem;
          font-size: 0.85rem;
          width: auto;
        }
        .btn-danger-outline:hover {
          background-color: #fee2e2;
          border-color: #dc2626;
        }
        .btn-copy {
          background-color: #4b5563;
          color: white;
          width: auto;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
        }
        .btn-copy:hover {
          background-color: #374151;
        }
        .alert {
          border-radius: 8px;
          padding: 1rem 1.5rem;
          margin-bottom: 2rem;
          border-left: 5px solid;
        }
        .alert-success {
          background-color: #ecfdf5;
          border-color: #10b981;
          color: #065f46;
        }
        .alert-danger {
          background-color: #fef2f2;
          border-color: #ef4444;
          color: #991b1b;
        }
        .alert-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }
        .alert-desc {
          margin-bottom: 1rem;
          font-size: 0.95rem;
        }
        .key-display-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #ffffff;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          border: 1px dashed #10b981;
          overflow-x: auto;
        }
        .key-code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 1.1rem;
          font-weight: bold;
          color: #047857;
          word-break: break-all;
          flex-grow: 1;
        }
        .table-responsive {
          overflow-x: auto;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.95rem;
        }
        .table th, .table td {
          padding: 0.85rem 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .table th {
          background-color: #f9fafb;
          color: #4b5563;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }
        .font-semibold {
          font-weight: 600;
          color: #111827;
        }
        .prefix-code {
          font-family: monospace;
          background-color: #f3f4f6;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          color: #374151;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .badge-active {
          background-color: #d1fae5;
          color: #065f46;
        }
        .badge-revoked {
          background-color: #f3f4f6;
          color: #4b5563;
        }
        .text-muted {
          color: #6b7280;
          font-size: 0.85rem;
        }
        .text-revoked {
          color: #9ca3af;
          font-style: italic;
          font-size: 0.9rem;
        }
        .empty-state {
          text-align: center;
          color: #6b7280;
          padding: 2rem 0;
          font-style: italic;
        }
      `}</style>
    </div>
  );
});
