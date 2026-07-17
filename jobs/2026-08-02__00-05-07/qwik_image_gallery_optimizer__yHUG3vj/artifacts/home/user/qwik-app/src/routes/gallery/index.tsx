import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { listImages } from "~/lib/db";

export const useGalleryImages = routeLoader$(() => {
  return listImages();
});

export default component$(() => {
  const images = useGalleryImages();

  return (
    <>
      <h1>Image Gallery</h1>

      <form
        method="post"
        action="/gallery/upload"
        enctype="multipart/form-data"
      >
        <input type="file" name="image" accept="image/*" required />
        <button type="submit">Upload</button>
      </form>

      <hr />

      <div class="gallery-grid">
        {images.value.length === 0 && <p>No images uploaded yet.</p>}
        {images.value.map((image) => (
          <div class="gallery-item" key={image.id}>
            <p>{image.original_name}</p>
            <a href={image.original_path}>
              <img
                src={image.optimized_path}
                alt={image.original_name}
                width={image.width}
                height={image.height}
              />
            </a>
            <p>
              {image.width}x{image.height}
            </p>
          </div>
        ))}
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: "Image Gallery",
  meta: [
    {
      name: "description",
      content: "Upload and browse optimized images.",
    },
  ],
};
