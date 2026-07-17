# Qwik CSV Importer with Strict Validation

## Background
In modern web applications, importing data from external files like CSV is a common requirement. However, processing file uploads and ensuring data integrity through strict validation is critical to prevent corrupt database states. In this task, you will build a robust, atomic CSV importer with strict validation using Qwik and Qwik City, backed by a local SQLite database.

## Requirements
1. **SQLite Database Setup**:
   - The application must use a local SQLite database located at `/home/user/qwik-app/database.sqlite`.
   - On application startup or first request, it must ensure a table named `users` exists with the following schema:
     - `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
     - `name` (TEXT, NOT NULL)
     - `email` (TEXT, NOT NULL)
     - `age` (INTEGER, NOT NULL)

2. **CSV Import Endpoint (`POST /import`)**:
   - Accept file uploads via `POST /import` with `multipart/form-data`. The file field name must be `file`.
   - The CSV file will have a header row with columns: `Name`, `Email`, `Age` (case-sensitive).
   - Parse the CSV on the server side.
   - Perform strict validation on each row:
     - `Name`: Must not be empty or only whitespace.
     - `Email`: Must be a valid email format (must contain a non-empty username, `@`, and a non-empty domain like `example.com`). Empty email also counts as invalid.
     - `Age`: Must be a non-negative integer (integer >= 0).
   - **Atomicity**: The entire import process must be atomic. If *any* row in the CSV fails validation, *no* rows must be saved to the database (roll back any inserts).
   - **Response Format**:
     - Return a JSON response with status 200 (even if validation fails, as long as the request was processed successfully).
     - Response schema:
       ```json
       {
         "success": boolean,
         "imported": number,
         "errors": [
           {
             "row": number,
             "errors": string[]
           }
         ]
       }
       ```
       - `success`: `true` if all rows are valid and imported; `false` if any row fails validation.
       - `imported`: The number of rows successfully imported. If `success` is `false`, this must be `0`.
       - `errors`: An array of error objects for each invalid row.
         - `row`: 1-based index of the data row (excluding the header row).
         - `errors`: A list of validation error strings. Use the exact error messages below:
           - Name empty/whitespace: `"Name cannot be empty"`
           - Email invalid/empty: `"Invalid email format"`
           - Age invalid/negative: `"Age must be an integer >= 0"`
         - If a row has multiple errors, they must be returned in the order: Name error, Email error, Age error.
         - The `errors` array in the response must be sorted by `row` ascending.

3. **Users Retrieval Endpoint (`GET /users`)**:
   - Return a JSON array of all users currently stored in the database, ordered by `id` ascending.
   - Endpoint: `GET /users`
   - Response format:
     ```json
     [
       {
         "id": number,
         "name": string,
         "email": string,
         "age": number
       }
     ]
     ```

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: `3000`
- Do NOT use any client-side CSV parsing libraries; parsing and validation must happen strictly on the server side (e.g., inside Qwik City request handlers or actions).
- Ensure the Qwik application is configured to run on port 3000.
- Make sure to handle database connections and transactions properly to guarantee atomicity.

