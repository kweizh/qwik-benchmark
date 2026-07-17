import { component$, useStore, useVisibleTask$, useSignal, $ } from "@builder.io/qwik";
import { routeLoader$, server$, type DocumentHead } from "@builder.io/qwik-city";
import { getPostsPage, type Post } from "../db.server";

export const useInitialPosts = routeLoader$(() => {
  return getPostsPage(null, 10);
});

export const fetchNextPage = server$(async (cursor: number) => {
  return getPostsPage(cursor, 10);
});

export default component$(() => {
  const initialData = useInitialPosts();
  const sentinelRef = useSignal<Element>();

  const state = useStore<{
    posts: Post[];
    hasMore: boolean;
    loading: boolean;
  }>({
    posts: [...initialData.value.posts] as Post[],
    hasMore: initialData.value.hasMore,
    loading: false,
  });

  const loadMore = $(async () => {
    if (state.loading || !state.hasMore) return;
    state.loading = true;
    try {
      const lastPost = state.posts[state.posts.length - 1];
      const lastId = lastPost ? lastPost.id : null;
      if (lastId !== null) {
        const result = await fetchNextPage(lastId);
        const existingIds = new Set(state.posts.map((p: Post) => p.id));
        const newPosts = result.posts.filter((p: Post) => !existingIds.has(p.id));
        state.posts.push(...newPosts);
        state.hasMore = result.hasMore;
      }
    } catch (err) {
      console.error("Error loading more posts:", err);
    } finally {
      state.loading = false;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    track(() => state.loading);
    track(() => state.hasMore);

    if (!state.hasMore || state.loading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          loadMore();
        }
      },
      {
        rootMargin: "50px",
      }
    );

    if (sentinelRef.value) {
      observer.observe(sentinelRef.value);
    }

    cleanup(() => {
      observer.disconnect();
    });
  });

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h1>Infinite-Scroll Feed</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {state.posts.map((post: Post) => (
          <div
            key={post.id}
            data-testid="feed-item"
            style={{
              padding: "20px",
              border: "1px solid #eaeaea",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              minHeight: "150px",
            }}
          >
            <h2 style={{ margin: "0 0 10px 0" }}>{post.title}</h2>
            <p style={{ margin: 0, color: "#666" }}>{post.body}</p>
          </div>
        ))}
      </div>

      {state.loading && (
        <div
          data-testid="feed-loading"
          style={{
            padding: "20px",
            textAlign: "center",
            fontWeight: "bold",
            color: "#0070f3",
          }}
        >
          Loading more posts...
        </div>
      )}

      {!state.hasMore && (
        <div
          data-testid="feed-end"
          style={{
            padding: "20px",
            textAlign: "center",
            fontWeight: "bold",
            color: "#666",
          }}
        >
          End of feed
        </div>
      )}

      <div
        ref={sentinelRef}
        data-testid="feed-sentinel"
        style={{ height: "10px", margin: "10px 0" }}
      />
    </div>
  );
});

export const head: DocumentHead = {
  title: "Infinite-Scroll Feed",
  meta: [
    {
      name: "description",
      content: "Infinite-Scroll Feed with Qwik City and SQLite",
    },
  ],
};
