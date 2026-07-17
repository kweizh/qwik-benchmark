# Qwik Image Gallery with Local Optimization

## Background
In modern web applications, optimizing user-uploaded images is critical for performance and user experience. Qwik, with its focus on instant loading and resumability, is highly suited for high-performance web interfaces. In this task, you will build a self-contained image gallery in a Qwik City application that allows users to upload images, automatically optimizes them on the server, and tracks the metadata in a local SQLite database.

## Requirements
- Create a fully functional image gallery under the `/gallery` route.
- Implement a POST `/gallery/upload` endpoint to handle image uploads, resize/optimize them, and save them locally.
- Implement a GET `/api/images` API endpoint that returns a JSON list of all uploaded images.
- Store the original and optimized image metadata in a local SQLite database.

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000
- **Database Specifications**:
  - SQLite database file path: `/home/user/qwik-app/gallery.db`
  - Table name: `images`
  - Table schema columns:
    - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
    - `original_name` (TEXT, not null - the original name of the uploaded file)
    - `original_path` (TEXT, not null - the public URL path starting with `/gallery/original/`)
    - `optimized_path` (TEXT, not null - the public URL path starting with `/gallery/optimized/`)
    - `width` (INTEGER, not null - the width of the optimized WebP image)
    - `height` (INTEGER, not null - the height of the optimized WebP image)
    - `uploaded_at` (TIMESTAMP or TEXT, default current timestamp)
- **Storage Specifications**:
  - Original images must be saved to `/home/user/qwik-app/public/gallery/original/` with a unique filename (e.g. using a timestamp or UUID) while preserving the original file extension.
  - Optimized images must be saved to `/home/user/qwik-app/public/gallery/optimized/` with a unique filename and in WebP format (extension `.webp`).
- **Optimization Specifications**:
  - The optimized image must be resized so that its maximum dimension (width or height) is exactly 800 pixels, preserving the aspect ratio.
  - If the original image is already smaller than 800x800 pixels, do not scale it up; keep its original dimensions but still optimize and convert it to WebP.
- **Route /gallery (GET)**:
  - Renders an HTML page.
  - Contains a file upload form with:
    - An `<input type="file" name="image" accept="image/*" />` element.
    - A submit button.
    - The form should submit to `/gallery/upload` via POST.
  - Displays a list/gallery of all uploaded images from the database:
    - For each image, display the original filename.
    - Display the optimized WebP image using an `<img src="...">` tag pointing to its `optimized_path`.
    - Provide a link (`<a href="...">`) pointing to its `original_path`.
    - Display the optimized dimensions in text (format: `width x height`, e.g., `800x600`).
- **Route /gallery/upload (POST)**:
  - Accepts a multi-part form-data request containing the file field named `image`.
  - Saves the original image and the optimized WebP image to their respective directories.
  - Inserts a new record into the SQLite database table `images`.
  - Redirects the user back to `/gallery` (HTTP status 302 or 303).
- **Route /api/images (GET)**:
  - Returns a JSON array of all image records from the `images` table, ordered by `uploaded_at` DESC.
  - Response format:
    ```json
    [
      {
        "id": 1,
        "original_name": "myphoto.png",
        "original_path": "/gallery/original/filename.png",
        "optimized_path": "/gallery/optimized/filename.webp",
        "width": 800,
        "height": 600
      }
    ]
    ```

