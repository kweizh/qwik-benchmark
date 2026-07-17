import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { getDb, type ImageRecord } from "../../lib/db";

export const useImages = routeLoader$(async () => {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, original_name, original_path, optimized_path, width, height, uploaded_at FROM images ORDER BY uploaded_at DESC")
    .all() as ImageRecord[];
  return rows;
});

export default component$(() => {
  const imagesSignal = useImages();

  return (
    <div>
      <h1>Image Gallery</h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Upload an Image</h2>
        <form action="/gallery/upload" method="post" enctype="multipart/form-data">
          <div style={{ marginBottom: "0.5rem" }}>
            <input type="file" name="image" accept="image/*" />
          </div>
          <button type="submit">Upload</button>
        </form>
      </section>

      <section>
        <h2>Gallery</h2>
        {imagesSignal.value.length === 0 ? (
          <p>No images uploaded yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "1rem",
            }}
          >
            {imagesSignal.value.map((img) => (
              <div
                key={img.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "1rem",
                  textAlign: "center",
                }}
              >
                <img
                  src={img.optimized_path}
                  alt={img.original_name}
                  style={{ maxWidth: "100%", height: "auto", borderRadius: "4px" }}
                  loading="lazy"
                />
                <p style={{ margin: "0.5rem 0", fontWeight: "bold" }}>
                  {img.original_name}
                </p>
                <p style={{ margin: "0.25rem 0", color: "#666" }}>
                  {img.width}x{img.height}
                </p>
                <a href={img.original_path} target="_blank" rel="noopener noreferrer">
                  View Original
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});
