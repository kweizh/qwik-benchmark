import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getImages } from "../../lib/db";

export const useGalleryImages = routeLoader$(async () => {
  const images = getImages();
  return images.map((img) => ({
    id: img.id,
    original_name: img.original_name,
    original_path: img.original_path,
    optimized_path: img.optimized_path,
    width: img.width,
    height: img.height,
  }));
});

export default component$(() => {
  const images = useGalleryImages();

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <header
        style={{
          marginBottom: "2rem",
          borderBottom: "1px solid #eaeaea",
          paddingBottom: "1rem",
        }}
      >
        <h1
          style={{ fontSize: "2.5rem", color: "#333", margin: "0 0 0.5rem 0" }}
        >
          Image Gallery
        </h1>
        <p style={{ color: "#666", margin: 0 }}>
          Upload images to automatically optimize them on the server and convert
          them to WebP.
        </p>
      </header>

      <section
        style={{
          backgroundColor: "#f9f9f9",
          padding: "1.5rem",
          borderRadius: "8px",
          marginBottom: "2.5rem",
          border: "1px solid #e2e8f0",
        }}
      >
        <h2
          style={{
            fontSize: "1.25rem",
            color: "#4a5568",
            marginTop: 0,
            marginBottom: "1rem",
          }}
        >
          Upload New Image
        </h2>
        <form
          action="/gallery/upload"
          method="POST"
          enctype="multipart/form-data"
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="file"
            name="image"
            accept="image/*"
            required
            style={{
              padding: "0.5rem",
              border: "1px solid #cbd5e0",
              borderRadius: "4px",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.6rem 1.2rem",
              backgroundColor: "#3182ce",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
          >
            Upload & Optimize
          </button>
        </form>
      </section>

      <section>
        <h2
          style={{
            fontSize: "1.5rem",
            color: "#2d3748",
            marginBottom: "1.5rem",
          }}
        >
          Optimized Gallery
        </h2>
        {images.value.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "#718096",
              backgroundColor: "#f7fafc",
              borderRadius: "8px",
              border: "1px dashed #cbd5e0",
            }}
          >
            No images uploaded yet. Use the form above to upload your first
            image!
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "2rem",
            }}
          >
            {images.value.map((image) => (
              <div
                key={image.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  overflow: "hidden",
                  backgroundColor: "#fff",
                  boxShadow:
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    paddingBottom: "75%",
                    backgroundColor: "#edf2f7",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={image.optimized_path}
                    alt={image.original_name}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
                <div
                  style={{
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    flexGrow: 1,
                  }}
                >
                  <div
                    style={{
                      fontWeight: "600",
                      fontSize: "1rem",
                      color: "#2d3748",
                      wordBreak: "break-all",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={image.original_name}
                  >
                    {image.original_name}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#718096" }}>
                    Dimensions:{" "}
                    <span style={{ fontWeight: "500", color: "#4a5568" }}>
                      {image.width}x{image.height}
                    </span>
                  </div>
                  <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
                    <a
                      href={image.original_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        fontSize: "0.875rem",
                        color: "#3182ce",
                        textDecoration: "none",
                        fontWeight: "500",
                      }}
                    >
                      View Original Image →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik Optimized Image Gallery",
  meta: [
    {
      name: "description",
      content:
        "A high-performance image gallery with automatic WebP optimization and SQLite metadata storage.",
    },
  ],
};
