# Qwik SQLite Role-Based Access Control (RBAC) System

## Background
Implement a Role-Based Access Control (RBAC) system in a Qwik City application using a local SQLite database.

## Requirements
- **Database Schema & Seeding**:
  - The SQLite database file must be located at `/home/user/qwik-app/prisma/dev.db`.
  - The database must contain a `User` table with the following columns:
    - `id`: INTEGER (Primary Key, Autoincrement)
    - `name`: TEXT (Not Null)
    - `email`: TEXT (Unique, Not Null)
    - `role`: TEXT (Not Null)
  - The database must be pre-seeded with the following users if it is empty or does not exist:
    - `admin@example.com`, name: `Admin User`, role: `ADMIN`
    - `user@example.com`, name: `Regular User`, role: `USER`

- **Session & Authentication**:
  - The application must determine the currently logged-in user by reading a cookie named `session_email`.
  - If the cookie is present and matches a user's email in the database, that user is authenticated and has their corresponding role.
  - If the cookie is missing, empty, or does not match any user in the database, the user is unauthenticated.

- **Routing & Authorization**:
  - **Route `/profile`**:
    - Accessible only to authenticated users with role `ADMIN` or `USER`.
    - Displays the logged-in user's name, email, and role.
    - For GET requests:
      - If authenticated and authorized (`ADMIN` or `USER`), returns HTTP status 200 and renders the profile page with the user's details.
      - If unauthenticated or unauthorized, returns HTTP status 403 OR redirects (status 302/307/308) to `/unauthorized`.
  - **Route `/admin/users`**:
    - Accessible only to authenticated users with role `ADMIN`.
    - Displays a list of all users in the database (showing id, name, email, role).
    - For GET requests:
      - If authenticated and has role `ADMIN`, returns HTTP status 200 and renders the user list.
      - If unauthenticated or unauthorized (role is not `ADMIN`), returns HTTP status 403 OR redirects (status 302/307/308) to `/unauthorized`.
  - **Route `/unauthorized`**:
    - Accessible to everyone.
    - Returns HTTP status 200 and displays an "Unauthorized" or "Access Denied" message.

- **Role Update Action**:
  - The `/admin/users` route must include a Qwik City `routeAction$` to update a user's role.
  - The `routeAction$` must be bound to a form rendered on `/admin/users`.
  - The form must contain:
    - An input or select field with `name="email"` (specifying the target user's email to update).
    - An input or select field with `name="role"` (specifying the new role, e.g., `ADMIN` or `USER`).
  - The `routeAction$` must verify that the performing user (retrieved from the `session_email` cookie) is authenticated and has the role `ADMIN`.
  - If the performing user is not an `ADMIN`, the action must fail (either return an HTTP 403 status, or return a JSON object indicating failure/unauthorized).
  - If the performing user is an `ADMIN`, the action must update the target user's role in the SQLite database and return a success response.

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000
- All database queries and mutations must be executed strictly within server-side boundaries (`routeLoader$`, `routeAction$`, or `server$`) to prevent database modules from leaking into client-side bundles.

