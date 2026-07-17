# Qwik City Dynamic Form Builder

## Background
In low-code and content management systems, dynamic forms are frequently generated based on database-stored schemas. You need to build a dynamic form rendering and server-side validation system using Qwik and Qwik City.

## Requirements
- Load form definitions dynamically from a local SQLite database and render the form fields based on their types and validation rules.
- Implement server-side validation for form submissions against the corresponding form schema.
- Persist valid submissions to the SQLite database and return a structured JSON response indicating success or specific validation errors.

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000
- SQLite Database Path: `/home/user/qwik-app/form_builder.sqlite`
- **Database Schema**:
  - Table `forms`:
    - `id` (TEXT PRIMARY KEY)
    - `schema` (TEXT) - JSON string of the form schema.
  - Table `submissions`:
    - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
    - `form_id` (TEXT)
    - `data` (TEXT) - JSON string representing the submitted form values.
    - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

- **Form Schema JSON Structure**:
  The `schema` column in the `forms` table contains a JSON object with a `fields` array. Each field object has the following structure:
  ```json
  {
    "fields": [
      {
        "name": "string",
        "type": "string" | "number" | "boolean",
        "required": boolean,
        "min": number,       // Optional, only for type "number"
        "max": number,       // Optional, only for type "number"
        "minLength": number, // Optional, only for type "string"
        "maxLength": number, // Optional, only for type "string"
        "pattern": "string"  // Optional, only for type "string" (regex pattern)
      }
    ]
  }
  ```

- **Routes & Endpoints**:
  - **GET `/forms/:id`**:
    - Fetches the form schema for `:id` from the SQLite `forms` table.
    - If the form ID does not exist, returns a `404 Not Found` response.
    - Renders an HTML page containing a `<form>` element with `method="POST"` and `action="/forms/:id/submit"`.
    - The form fields must be rendered dynamically:
      - `"string"` type fields must render as `<input type="text" name="[field_name]">`.
      - `"number"` type fields must render as `<input type="number" name="[field_name]">`.
      - `"boolean"` type fields must render as `<input type="checkbox" name="[field_name]">`.
      - Each field must have a corresponding `<label>` element.
      - If the form is submitted and fails server-side validation, the page should display the validation error messages next to or near their respective fields.
  - **POST `/forms/:id/submit`**:
    - Must accept both standard URL-encoded form submissions (`application/x-www-form-urlencoded`) and JSON submissions (`application/json`).
    - Fetches the form schema for `:id` from the SQLite `forms` table.
    - Validates the submitted data against the schema:
      - If a field is `required` but missing or empty (for string/number), it fails validation.
      - Fields of type `"number"` must be parsed as numbers and validated against `min` and `max` constraints (if specified).
      - Fields of type `"string"` must be validated against `minLength`, `maxLength`, and `pattern` constraints (if specified).
      - Fields of type `"boolean"` must be parsed/validated as booleans (e.g., checkbox checked/unchecked).
    - **Validation Failure Response**:
      - Status code: `400 Bad Request`
      - Response body (JSON):
        ```json
        {
          "success": false,
          "errors": {
            "<field_name>": "<error_message_string>"
          }
        }
        ```
    - **Validation Success Response**:
      - Saves the valid submission to the `submissions` table, storing the validated/parsed fields as a JSON string in the `data` column.
      - Status code: `200 OK` or `201 Created`
      - Response body (JSON):
        ```json
        {
          "success": true,
          "submissionId": <inserted_id_integer>
        }
        ```

