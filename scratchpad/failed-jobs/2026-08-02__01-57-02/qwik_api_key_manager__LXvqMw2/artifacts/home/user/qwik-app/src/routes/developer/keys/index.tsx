import { component$, useSignal } from '@builder.io/qwik';
import { routeLoader$, routeAction$, Form } from '@builder.io/qwik-city';
import db from '../../../utils/db';
import { generateApiKey, hashApiKey, getPrefix } from '../../../utils/keys';

export const useKeysLoader = routeLoader$(async () => {
  const stmt = db.prepare(`
    SELECT id, name, key_prefix AS prefix, status, created_at
    FROM api_keys
    ORDER BY id DESC
  `);
  return stmt.all() as { id: number; name: string; prefix: string; status: 'active' | 'revoked'; created_at: string }[];
});

export const useGenerateKeyAction = routeAction$(async (data) => {
  const name = (data.name as string || '').trim();
  if (!name) {
    return {
      success: false,
      error: 'Name is required'
    };
  }

  try {
    const plainKey = generateApiKey();
    const prefix = getPrefix(plainKey);
    const hashed = hashApiKey(plainKey);
    const status = 'active';
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO api_keys (name, key_prefix, hashed_key, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(name, prefix, hashed, status, createdAt);

    return {
      success: true,
      plainKey,
      name
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message
    };
  }
});

export const useRevokeKeyAction = routeAction$(async (data) => {
  const id = parseInt(data.id as string, 10);
  if (isNaN(id)) {
    return {
      success: false,
      error: 'Invalid key ID'
    };
  }

  try {
    const updateStmt = db.prepare("UPDATE api_keys SET status = 'revoked' WHERE id = ?");
    updateStmt.run(id);
    return {
      success: true
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message
    };
  }
});

export default component$(() => {
  const keysSignal = useKeysLoader();
  const generateAction = useGenerateKeyAction();
  const revokeAction = useRevokeKeyAction();

  const dismissedKey = useSignal<string | null>(null);

  const showSuccessBox =
    generateAction.value?.success &&
    generateAction.value?.plainKey &&
    dismissedKey.value !== generateAction.value.plainKey;

  return (
    <div class="container">
      <header>
        <h1>API Key Manager</h1>
        <p>Generate, view, and revoke API keys for your applications.</p>
      </header>

      {/* Prominent Alert Box for newly generated key */}
      {showSuccessBox && (
        <div class="alert alert-success">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3>API Key Generated Successfully!</h3>
              <p>
                Please copy your API key now. For security reasons, <strong>we cannot show it to you again</strong>.
              </p>
              <div class="api-key-display">
                <code>{generateAction.value.plainKey}</code>
              </div>
            </div>
            <button
              onClick$={() => {
                dismissedKey.value = generateAction.value!.plainKey!;
              }}
              class="btn"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#065f46',
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '0 0.5rem',
                fontSize: '1.25rem'
              }}
              title="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Error alert if actions fail */}
      {generateAction.value?.success === false && (
        <div class="alert alert-danger">
          <h3>Error Generating Key</h3>
          <p>{generateAction.value.error}</p>
        </div>
      )}

      {revokeAction.value?.success === false && (
        <div class="alert alert-danger">
          <h3>Error Revoking Key</h3>
          <p>{revokeAction.value.error}</p>
        </div>
      )}

      <div class="card">
        <h2>Generate New API Key</h2>
        <Form action={generateAction}>
          <div class="form-group">
            <label for="key-name">Key Name / Description</label>
            <input
              type="text"
              id="key-name"
              name="name"
              placeholder="e.g. Production Server Key"
              class="input-control"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary" disabled={generateAction.isRunning}>
            {generateAction.isRunning ? 'Generating...' : 'Generate Key'}
          </button>
        </Form>
      </div>

      <div class="card">
        <h2>Your API Keys</h2>
        {keysSignal.value.length === 0 ? (
          <div class="no-keys">
            <p>You don't have any API keys yet. Generate one above!</p>
          </div>
        ) : (
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keysSignal.value.map((key) => {
                  const isRevokingThisKey =
                    revokeAction.isRunning &&
                    revokeAction.formData?.get('id') === String(key.id);

                  return (
                    <tr key={key.id}>
                      <td style={{ fontWeight: '500' }}>{key.name}</td>
                      <td>
                        <code style={{ backgroundColor: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '0.25rem' }}>
                          {key.prefix}
                        </code>
                      </td>
                      <td>
                        <span
                          class={`badge ${
                            key.status === 'active' ? 'badge-success' : 'badge-danger'
                          }`}
                        >
                          {key.status}
                        </span>
                      </td>
                      <td>{new Date(key.created_at).toLocaleString()}</td>
                      <td>
                        {key.status === 'active' ? (
                          <Form action={revokeAction}>
                            <input type="hidden" name="id" value={key.id} />
                            <button
                              type="submit"
                              class="btn btn-danger"
                              style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                              disabled={isRevokingThisKey}
                            >
                              {isRevokingThisKey ? 'Revoking...' : 'Revoke'}
                            </button>
                          </Form>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Revoked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});
