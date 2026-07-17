# Dynamic i18n Localization System in Qwik City

## Background
In modern web applications, supporting multiple languages is a core requirement. For high-performance frameworks like Qwik, localization must be designed to leverage Server-Side Rendering (SSR) and fine-grained lazy loading. This task requires you to implement a dynamic internationalization (i18n) localization system in Qwik City that supports URL-prefix routing, cookie-based fallback/fallback-setting, runtime file-system translation loading, and an interactive language switcher.

## Requirements
- **Locale Detection and Routing**:
  - The system must support two locales: English (`en`) and French (`fr`).
  - URL prefix routing: Paths starting with `/[locale]/` (e.g., `/en/dashboard`, `/fr/profile`) must set the active locale to `[locale]`.
  - Non-prefixed routing: Accessing paths without a locale prefix (e.g., `/dashboard`, `/profile`, or `/`) must check for a `locale` cookie.
    - If the `locale` cookie is set to a valid locale (`en` or `fr`), redirect (HTTP 302) to the localized path (e.g., `/fr/dashboard`).
    - If the `locale` cookie is not set or invalid, default to `en`, redirect (HTTP 302) to the localized path (e.g., `/en/dashboard`), and set the `locale` cookie to `en`.
- **Translation Loading**:
  - Translations must be loaded dynamically from the local file system on the server side at runtime from `/home/user/qwik-app/locales/en.json` and `/home/user/qwik-app/locales/fr.json`.
  - To prevent server-only modules or large translation payloads from leaking into client-side bundles, translation files must **not** be statically imported or bundled into client-side JavaScript.
- **Pages and Translation Keys**:
  - Implement two pages: `/dashboard` and `/profile` (available under both locales, e.g., `/en/dashboard`, `/fr/profile`).
  - **Dashboard Page (`/[locale]/dashboard`)**:
    - Must render an `<h1>` containing the translated dashboard title.
    - Must render a `<p>` containing the translated welcome message. The welcome message contains a `{name}` placeholder which must be dynamically replaced with the value of the `name` query parameter (e.g., `/en/dashboard?name=Alice` should render `Welcome to your dashboard, Alice!`). If no `name` query parameter is provided, it must default to "Guest" for English, and "invité" for French.
  - **Profile Page (`/[locale]/profile`)**:
    - Must render an `<h1>` containing the translated profile title.
    - Must render a `<div>` or `<p>` containing the translated email label followed by `: user@example.com` (e.g., `Email Address: user@example.com` in English, or `Adresse e-mail: user@example.com` in French).
- **Language Switcher Component**:
  - A reusable language switcher component must be visible on both pages across all locales.
  - It must contain two interactive links or buttons:
    - One for English with `id="switch-en"`.
    - One for French with `id="switch-fr"`.
  - When clicked/activated, the switcher must:
    1. Set the `locale` cookie to the selected language (`en` or `fr`) with `path=/`.
    2. Redirect the user to the same page and query parameters, but with the new locale prefix (e.g., if a user is on `/en/dashboard?name=Bob` and clicks the French switcher, they must be redirected to `/fr/dashboard?name=Bob` and the cookie must be updated to `fr`).

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: `3000`
- Translation Files Structure:
  - `/home/user/qwik-app/locales/en.json`:
    ```json
    {
      "dashboard": {
        "title": "Dashboard",
        "welcome": "Welcome to your dashboard, {name}!"
      },
      "profile": {
        "title": "User Profile",
        "email_label": "Email Address"
      }
    }
    ```
  - `/home/user/qwik-app/locales/fr.json`:
    ```json
    {
      "dashboard": {
        "title": "Tableau de bord",
        "welcome": "Bienvenue sur votre tableau de bord, {name}!"
      },
      "profile": {
        "title": "Profil de l'utilisateur",
        "email_label": "Adresse e-mail"
      }
    }
    ```
- Cookie Specifications:
  - Name: `locale`
  - Path: `/`
  - Values: `en` or `fr`
- Expected HTML Elements and Selectors for Verification:
  - Dashboard Page:
    - `h1`: Must contain the translated title (e.g., `Dashboard` or `Tableau de bord`).
    - `p`: Must contain the welcome text (e.g., `Welcome to your dashboard, Alice!` or `Bienvenue sur votre tableau de bord, Alice!`).
  - Profile Page:
    - `h1`: Must contain the translated title (e.g., `User Profile` or `Profil de l'utilisateur`).
    - A text element containing the email label and address (e.g., `Email Address: user@example.com` or `Adresse e-mail: user@example.com`).
  - Language Switcher:
    - Must have an element with `id="switch-en"`.
    - Must have an element with `id="switch-fr"`.

