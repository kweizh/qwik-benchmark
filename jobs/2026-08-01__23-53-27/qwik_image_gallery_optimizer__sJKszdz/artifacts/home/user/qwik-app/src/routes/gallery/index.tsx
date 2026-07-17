import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getAllImages } from "../../lib/db";

export const useImagesLoader = routeLoader$(async () => {
  try {
    return await getAllImages();
  } catch (error) {
    console.error("Loader error:", error);
    return [];
  }
});

export default component$(() => {
  const imagesSignal = useImagesLoader();

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "20px" }}>Image Gallery</h1>

      {/* Upload Form */}
      <div style={{ background: "#f5f5f5", padding: "20px", borderRadius: "8px", marginBottom: "30px" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Upload New Image</h2>
        <form action="/gallery/upload" method="POST" enctype="multipart/form-data" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input type="file" name="image" accept="image/*" required style={{ border: "1px solid #ccc", padding: "8px", borderRadius: "4px" }} />
          <button type="submit" style={{ background: "#0070f3", color: "white", border: "none", padding: "10px 20px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
            Upload
          </button>
        </form>
      </div>

      {/* Gallery List */}
      <h2 style={{ fontSize: "1.5rem", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>Uploaded Images</h2>
      {imagesSignal.value.length === 0 ? (
        <p style={{ color: "#666" }}>No images uploaded yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", marginTop: "20px" }}>
          {imagesSignal.value.map((img) => (
            <div key={img.id} style={{ border: "1px solid #eee", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
              <div style={{ background: "#fafafa", height: "200px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <img
                  src={img.optimized_path}
                  alt={img.original_name}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              </div>
              <div style={{ padding: "15px", display: "flex", flexDirection: "column", gap: "8px", flexGrow: 1 }}>
                <div style={{ fontWeight: "bold", wordBreak: "break-all", fontSize: "0.95rem" }} title={img.original_name}>
                  {img.original_name}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#666" }}>
                  Dimensions: <span>{img.width}x{img.height}</span>
                </div>
                <div style={{ marginTop: "auto", paddingTop: "10px" }}>
                  <a
                    href={img.original_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0070f3", textDecoration: "none", fontSize: "0.9rem", fontWeight: "500" }}
                  >
                    View Original
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik Image Gallery",
  meta: [
    {
      name: "description",
      content: "A high-performance self-contained image gallery",
    },
  ],
};
