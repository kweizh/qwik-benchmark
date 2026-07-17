# Qwik City JWT Authentication Middleware

## Background
Secure routing and session management are fundamental aspects of full-stack web applications. In Qwik City, middleware and routing primitives can be composed to intercept incoming requests, verify credentials, and protect sensitive pages.

Your task is to implement a complete, secure JWT-based authentication middleware system in a Qwik City application.

## Requirements
You must implement the following routes and middleware behavior in the Qwik City application located at `/home/user/qwik-app`:

1. **Authentication Middleware**:
   - Intercepts requests to `/admin/*` and checks for the presence of a cookie named `jwt_token`.
   - Verifies the signature of the `jwt_token` cookie using the HMAC-SHA256 algorithm and the secret key `secret_key_123`.
   - Decodes the JWT payload and verifies that the `role` field is equal to `"admin"`.
   - If the token is missing, invalid, or does not have the `"admin"` role, the middleware must redirect the client to `/login` with a `302 Found` status code.
   - If the token is valid and contains the `"admin"` role, the request is allowed to proceed.

2. **Login Route (`/login`)**:
   - **GET `/login`**: Renders a page containing the text `Login Page`.
   - **POST `/login`**: Accepts standard form submissions (URL-encoded) or JSON POST requests containing `username` and `password`.
     - Valid credentials are: username `admin` and password `password123`.
     - If the credentials are valid, it must generate a JWT signed with HMAC-SHA256 using the secret key `secret_key_123`. The JWT payload must contain:
       ```json
       {
         "username": "admin",
         "role": "admin"
       }
       ```
     - It must set a cookie named `jwt_token` with the generated JWT as its value.
     - It must redirect the client to `/admin/dashboard` with a `302 Found` status code.
     - If the credentials are invalid, it must return a `401 Unauthorized` status code and a JSON response:
       ```json
       {
         "error": "Invalid credentials"
       }
       ```

3. **Admin Dashboard Route (`/admin/dashboard`)**:
   - **GET `/admin/dashboard`**: Only accessible if the `jwt_token` is valid and contains the `"admin"` role.
   - If authorized, returns a `200 OK` status and renders a page containing the text `Welcome to the Admin Dashboard, admin!`.

4. **Logout Route (`/logout`)**:
   - **POST `/logout`**: Clears the `jwt_token` cookie and redirects the client to `/login` with a `302 Found` status code.

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000
- **Do NOT** add any external routing libraries; use Qwik City's native directory-based routing and middleware features.
- All redirect status codes must be exactly `302`.
- Cookies must be managed using Qwik City's request event context or standard HTTP headers.
- The JWT secret key is exactly `secret_key_123`.

