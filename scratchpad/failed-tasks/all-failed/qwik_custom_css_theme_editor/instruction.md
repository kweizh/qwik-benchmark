# Qwik Custom CSS Theme Editor

## Background
Web applications often require user-customizable themes that persist across sessions. To avoid content layout shifts (CLS) and the flash of unstyled content (FOUC), these themes must be resolved and applied on the server during Server-Side Rendering (SSR) before the HTML is sent to the browser.

## Requirements
Create a server-side theme editor in a Qwik City application that allows users to customize their visual preferences and persists those settings using a cookie. The theme must be applied dynamically during SSR by injecting CSS custom properties directly into the `<head>`.

### 1. Theme Configuration & Defaults
The theme editor must support three custom properties:
- **Primary Color**: A CSS color value (e.g., hex color code).
- **Font Size**: A CSS length value (e.g., `px`, `rem`, `em`).
- **Border Radius**: A CSS length or percentage value (e.g., `px`, `rem`, `em`, `%`).

If no custom theme is saved, the application must fall back to the following default values:
- Primary Color: `#00bcd4`
- Font Size: `16px`
- Border Radius: `4px`

### 2. Cookie Persistence
- All user theme customizations must be saved in a cookie named `user_theme`.
- The cookie value must be a JSON string representing an object with the following exact keys:
  - `primaryColor` (string)
  - `fontSize` (string)
  - `borderRadius` (string)
- The cookie must be set with `path=/` so that it is accessible across the entire application.

### 3. Server-Side Theme Injection (SSR)
- The root layout or document structure must read the `user_theme` cookie on the server during SSR.
- It must inject a `<style>` tag with the exact ID `theme-variables` into the `<head>` of the HTML document.
- This style tag must define CSS custom properties on the `:root` selector matching the current theme values (either from the cookie or the defaults):
  ```css
  :root {
    --primary-color: <primaryColor>;
    --font-size: <fontSize>;
    --border-radius: <borderRadius>;
  }
  ```
- This style tag must be present in the HTML response of all pages (including `/` and `/theme`) on initial server-side load.

### 4. Theme Editor Route (`/theme`)
- **GET `/theme`**:
  - Renders a form allowing the user to customize the three theme properties.
  - The form inputs must be pre-populated with the current theme values (from the `user_theme` cookie or the defaults).
  - The form input fields must have the following exact `name` attributes:
    - `primaryColor`
    - `fontSize`
    - `borderRadius`
- **POST `/theme`**:
  - Handles form submission on the server.
  - **Server-Side Validation**:
    - `primaryColor` must be a valid hex color code (e.g., starting with `#` followed by exactly 3 or 6 hexadecimal characters, like `#ff0000` or `#f00`).
    - `fontSize` must be a valid CSS length starting with a number and ending with `px`, `rem`, or `em`.
    - `borderRadius` must be a valid CSS length or percentage starting with a number and ending with `px`, `rem`, `em`, or `%`.
  - **Success Path**:
    - If validation passes, update the `user_theme` cookie with the new JSON values and redirect the user back to `/theme` with a `302 Found` or `303 See Other` status code.
  - **Failure Path**:
    - If any input is invalid, the server must return a `400 Bad Request` status code.
    - The page must render an error message containing the word `invalid` followed by the name of the invalid field (e.g., `invalid primaryColor`, `invalid fontSize`, or `invalid borderRadius`).

### 5. Theme Reset Route (`/theme/reset`)
- **POST `/theme/reset`** (or a form submitting to this route):
  - Clears the `user_theme` cookie (e.g., deletes it or sets its max-age to 0).
  - Redirects the user back to `/theme` using a `302 Found` or `303 See Other` status code, which will restore the default theme values.

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000

