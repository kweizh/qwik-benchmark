# Image Upload Gallery with Qwik City

## Background
You are building a self-contained image upload gallery using the **Qwik** framework and its meta-framework **Qwik City**. A pre-scaffolded, dependency-installed Qwik City application (the `empty` starter) is available at `/home/user/qwik-gallery`. Your job is to implement the gallery feature on the site's index route (`/`).

The application must let a visitor upload an image through an HTML form. The upload is processed **entirely on the server** by a Qwik City form action, which validates the file and stores it on the local filesystem. A server-side loader reads the stored files back from disk and renders them as a gallery grid. Everything runs locally: there are no databases, cloud storage, or external services.

## Requirements
- On the index route (`/`), render a page that contains:
  - An upload `<Form>` wired to a Qwik City `routeAction$` that accepts a single image file.
  - A gallery section that displays every previously uploaded image.
- Handle the upload on the server with a `routeAction$` that receives the `multipart/form-data` submission and persists the uploaded file to a local uploads directory using Node's `fs/promises` API.
- List the stored files with a `routeLoader$` that reads the uploads directory on the server and passes the file list to the component for rendering.
- Validate every upload on the server and reject invalid files **without storing them**, returning a field-level error that is shown on the page.
- Keep all server-only filesystem code inside server boundaries so it never leaks into the client bundle; the production build must compile cleanly.

## Implementation Hints
- Use Qwik City's `routeLoader$` for server-side listing and `routeAction$` (with the `<Form>` component) for the upload; keep `fs`/`path` imports and usage confined to these server-only functions so the optimizer does not drag Node modules into the browser bundle.
- An uploaded file arrives as a web `File`/`Blob`; read its bytes (e.g. via `arrayBuffer()`) and write them to disk with `fs/promises`.
- Validate the MIME type/extension and byte size server-side, and surface rejections through the action's failure/field-error mechanism.
- Project path: `/home/user/qwik-gallery`
- Implement the feature on the index route file `src/routes/index.tsx`.
- The file `<input type="file">` element must use the field name `image`.
- Store uploaded files in the directory `public/uploads` (create it if it does not exist), preserving the uploaded file's name. Because files in `public/` are served from the site root, a stored file named `foo.png` is reachable at the URL path `/uploads/foo.png`.
- Accept only image uploads with one of these extensions/types: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`. Reject anything else.
- Reject any upload larger than 2 MiB (2097152 bytes). Rejected uploads (wrong type or too large) must NOT be written anywhere under `public/uploads`.
- The gallery must render each stored image as an `<img>` element whose `src` attribute is exactly `/uploads/<filename>`.
- Start command (long-running app): `npm run dev -- --port 3000 --host 0.0.0.0`
- Port: `3000`
- The production build command `npm run build` must complete successfully (exit code 0).

