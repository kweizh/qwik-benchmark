# Qwik Complex Multi-Step Signup Wizard

## Background
In modern web applications, stateful multi-step wizards (such as user signups or checkout flows) are common. Implementing them in a modern meta-framework while supporting progressive enhancement (working without client-side JavaScript) requires careful design using server-side capabilities, cookie-based session state, and precise form handling.

## Requirements
Create a 3-step signup wizard at route `/signup` in a Qwik City application located at `/home/user/qwik-app`.

- **Step 1: Account Details (`/signup?step=1`)**
  - Render a form with two fields: `username` and `password` (type `password`).
  - On form submission (POST):
    - Validate that `username` is at least 3 characters long.
    - Validate that `password` is at least 6 characters long.
    - If validation fails, display validation error messages:
      - "Username must be at least 3 characters" if username is too short.
      - "Password must be at least 6 characters" if password is too short.
      - Keep the user on Step 1 and retain the entered `username` value (but not the password).
    - If validation passes, set a cookie named `signup_step1` with the path `/` containing a JSON object `{"username": "<username>", "password": "<password>"}`. Then, redirect (HTTP 302/303) to `/signup?step=2`.

- **Step 2: Profile Details (`/signup?step=2`)**
  - If the user accesses Step 2 but the `signup_step1` cookie is missing, redirect them back to `/signup?step=1`.
  - Render a form with two fields: `fullName` and `email` (type `email`).
  - On form submission (POST):
    - Validate that `fullName` is at least 2 characters long.
    - Validate that `email` is a valid email address format.
    - If validation fails, display validation error messages:
      - "Full name must be at least 2 characters" if fullName is too short.
      - "Invalid email address" if email is invalid.
      - Keep the user on Step 2 and retain the entered values.
    - If validation passes, set a cookie named `signup_step2` with the path `/` containing a JSON object `{"fullName": "<fullName>", "email": "<email>"}`. Then, redirect (HTTP 302/303) to `/signup?step=3`.

- **Step 3: Review & Submit (`/signup?step=3`)**
  - If the user accesses Step 3 but either the `signup_step1` or `signup_step2` cookie is missing, redirect them back to `/signup?step=1`.
  - Render the entered details for review: display the `username`, `fullName`, and `email` (do not display the password, or mask it).
  - Render a confirmation form with a submit button.
  - On form submission (POST):
    - Clear/delete both cookies `signup_step1` and `signup_step2`.
    - Render a success view displaying the message "Signup complete!" and a link or button to start over at `/signup?step=1`.

- **Routing & Edge Cases**
  - If the route `/signup` is accessed without a `step` query parameter, or if `step` is invalid (not `1`, `2`, or `3`), redirect to `/signup?step=1`.

- **Progressive Enhancement**
  - The entire wizard must work without client-side JavaScript enabled. All validation, cookie management, and state transitions must be handled on the server side using standard HTTP POST form submissions and HTTP redirect headers.

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000
- Route: `/signup`
- Cookies:
  - `signup_step1` and `signup_step2` must be set on the path `/` and contain URL-encoded JSON strings representing the respective step data.
  - To delete cookies, standard HTTP cookie deletion mechanisms (setting Max-Age=0 or Expires in the past) must be used.
- Progressive Enhancement:
  - Do NOT rely on client-side state, JavaScript-driven navigation, or client-side event handlers for step transitions or validations.
  - The form elements must use native submission behavior.

