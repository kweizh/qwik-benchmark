import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { db } from "../../lib/db";

export const useImagesLoader = routeLoader$(() => {
  const stmt = db.prepare(`
    SELECT id, original_name, original_path, optimized_path, width, height
    FROM images
    ORDER BY uploaded_at DESC
  `);
  return stmt.all() as Array<{
    id: number;
    original_name: string;
    original_path: string;
    optimized_path: string;
    width: number;
    height: number;
  }>;
});

export default component$(() => {
  const images = useImagesLoader();

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Image Gallery</h1>

      {/* File Upload Form */}
      <section style={{ marginBottom: "40px", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h2>Upload New Image</h2>
        <form action="/gallery/upload" method="POST" enctype="multipart/form-data">
          <div style={{ marginBottom: "15px" }}>
            <input type="file" name="image" accept="image/*" required />
          </div>
          <button type="submit" style={{ padding: "10px 20px", cursor: "pointer" }}>Upload</button>
        </form>
      </section>

      {/* Gallery List */}
      <section>
        <h2>Uploaded Images</h2>
        {images.value.length === 0 ? (
          <p>No images uploaded yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
            {images.value.map((img) => (
              <div key={img.id} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontWeight: "bold", wordBreak: "break-all" }}>{img.original_name}</div>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px", overflow: "hidden", background: "#f9f9f9" }}>
                  <img
                    src={img.optimized_path}
                    alt={img.original_name}
                    width={img.width}
                    height={img.height}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                </div>
                <div>
                  <strong>Optimized size:</strong> {img.width}x{img.height}
                </div>
                <div>
                  <a href={img.original_path} target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc", textDecoration: "none" }}>
                    View Original
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});
