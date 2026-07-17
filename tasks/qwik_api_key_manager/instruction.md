# Qwik API Key Manager

## Background
In modern web applications, exposing internal databases or services directly to third-party developers is a security risk. A common solution is to implement an API Key management system where developers can generate, view, and revoke API keys via a dashboard, and use those keys to authenticate their API requests.

In this task, you will build a secure API Key Management system using the **Qwik** and **Qwik City** meta-framework, backed by a local **SQLite** database.

## Requirements

### 1. Database Schema
Your application must use a SQLite database located at `/home/user/qwik-app/db.sqlite`. It must contain a table named `api_keys` with the following schema:
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `name` (TEXT NOT NULL) - A user-friendly name/description for the key.
- `key_prefix` (TEXT NOT NULL) - The prefix of the key (e.g., `qk_abcd`) to help identify it.
- `hashed_key` (TEXT NOT NULL) - The SHA-256 hash (hex encoded) of the full plain text API key.
- `status` (TEXT NOT NULL) - The status of the key, which must be either `'active'` or `'revoked'`.
- `created_at` (TEXT NOT NULL) - An ISO 8601 timestamp representing when the key was created.

### 2. API Key Generation & Security
- When a new key is generated, it must be a string starting with the prefix `qk_` followed by 32 random alphanumeric characters (total length of 35 characters).
- The `key_prefix` stored in the database must be the first 7 characters of the generated key (e.g., `qk_` plus the first 4 random characters).
- The plain text key must be hashed using SHA-256 (hex encoded) and stored in the `hashed_key` column.
- **CRITICAL SECURITY REQUIREMENT:** The plain text key must **NEVER** be stored in the database. A security audit will check the database contents to verify this.

### 3. REST API Endpoints
You must implement the following REST API endpoints in your Qwik City application:

#### A. POST `/api/v1/developer/keys`
Generates a new API key.
- **Request Body (JSON):**
  ```json
  {
    "name": "string"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": number,
    "name": "string",
    "prefix": "string",
    "key": "string",
    "status": "active",
    "created_at": "string"
  }
  ```
  *Note: This is the ONLY time the plain text `key` is returned to the client.*

#### B. GET `/api/v1/developer/keys`
Lists all generated API keys.
- **Response (200 OK):**
  ```json
  [
    {
      "id": number,
      "name": "string",
      "prefix": "string",
      "status": "active" | "revoked",
      "created_at": "string"
    }
  ]
  ```
  *Note: The plain text `key` or the `hashed_key` must NOT be returned in this response.*

#### C. POST `/api/v1/developer/keys/:id/revoke`
Revokes an API key by setting its status to `'revoked'` in the database.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "string"
  }
  ```
  If the key ID does not exist, return a `404 Not Found` status with `{"error": "Key not found"}`.

#### D. GET `/api/v1/hello`
An authenticated endpoint that requires a valid and active API key passed in the `X-API-Key` header.
- **Request Header:** `X-API-Key: qk_...`
- **Response (200 OK) if valid:**
  ```json
  {
    "message": "Hello, authenticated developer!"
  }
  ```
- **Response (401 Unauthorized) if missing, invalid, or revoked:**
  ```json
  {
    "error": "Unauthorized"
  }
  ```

### 4. UI Dashboard Route
Implement a user-friendly UI route at `/developer/keys`:
- It must display a list of all existing keys showing their name, prefix, status, and creation date.
- It must include a form with an input field for the key name and a submit button to generate a new key.
- When a new key is successfully generated, the plain text key must be displayed **exactly once** to the user in a prominent success/alert box (since it cannot be retrieved again).
- Each listed key must have a button or form to revoke it. Clicking the button must trigger key revocation and update the list dynamically or via page reload.

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000
- SQLite database path: `/home/user/qwik-app/db.sqlite`
- Ensure that all database interactions are safe from SQL injection (use parameterized queries or a secure ORM/query builder).
- Ensure that concurrent requests to generate or revoke keys do not result in database locking issues (e.g., handle SQLite busy states correctly if needed, or use a single connection pool/appropriate configuration).
- Do not include any mock data; the application must read and write to the SQLite database.

