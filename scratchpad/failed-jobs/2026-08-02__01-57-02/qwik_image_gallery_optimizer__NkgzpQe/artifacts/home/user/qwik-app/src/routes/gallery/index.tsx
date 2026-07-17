import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import db from '../../db';

export const useImages = routeLoader$(() => {
  try {
    const stmt = db.prepare('SELECT * FROM images ORDER BY uploaded_at DESC');
    const images = stmt.all() as Array<{
      id: number;
      original_name: string;
      original_path: string;
      optimized_path: string;
      width: number;
      height: number;
      uploaded_at: string;
    }>;
    return images;
  } catch (err) {
    console.error('Error loading images:', err);
    return [];
  }
});

export default component$(() => {
  const imagesSignal = useImages();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '1.5rem', color: '#333' }}>Image Gallery</h1>
      
      {/* Upload Form */}
      <section style={{ backgroundColor: '#f5f5f5', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '1rem' }}>Upload New Image</h2>
        <form action="/gallery/upload" method="POST" enctype="multipart/form-data" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="file" 
            name="image" 
            accept="image/*" 
            required 
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}
          />
          <button 
            type="submit" 
            style={{ 
              padding: '0.5rem 1.5rem', 
              backgroundColor: '#0070f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Upload
          </button>
        </form>
      </section>

      {/* Gallery Grid */}
      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Uploaded Images</h2>
        {imagesSignal.value.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No images uploaded yet.</p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '2rem' 
          }}>
            {imagesSignal.value.map((img) => (
              <div 
                key={img.id} 
                style={{ 
                  border: '1px solid #eaeaea', 
                  borderRadius: '8px', 
                  overflow: 'hidden', 
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Optimized WebP Image */}
                <div style={{ position: 'relative', width: '100%', paddingTop: '75%', backgroundColor: '#fafafa' }}>
                  <img 
                    src={img.optimized_path} 
                    alt={img.original_name} 
                    width={img.width}
                    height={img.height}
                    style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain' 
                    }} 
                  />
                </div>
                
                {/* Image Details */}
                <div style={{ padding: '1rem', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 
                      style={{ 
                        margin: '0 0 0.5rem 0', 
                        fontSize: '1rem', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
                      }} 
                      title={img.original_name}
                    >
                      {img.original_name}
                    </h3>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#666' }}>
                      Dimensions: <strong>{img.width}x{img.height}</strong>
                    </p>
                  </div>
                  
                  {/* Link to original */}
                  <a 
                    href={img.original_path} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'inline-block', 
                      textAlign: 'center',
                      padding: '0.5rem', 
                      backgroundColor: '#eaeaea', 
                      color: '#333', 
                      textDecoration: 'none', 
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
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

export const head: DocumentHead = {
  title: "Image Gallery",
};
