import {
  component$,
  useStore,
  useSignal,
  useVisibleTask$,
  $,
  noSerialize,
  type NoSerialize,
} from "@builder.io/qwik";
import {
  routeLoader$,
  server$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import type { Post } from "../server/db.server";

interface FeedPagePayload {
  posts: Post[];
  hasMore: boolean;
}

interface FeedStore {
  posts: Post[];
  cursor: number;
  hasMore: boolean;
  loading: boolean;
  finished: boolean;
}

/**
 * Initial page – executed on the server during SSR. The result is embedded
 * directly into the HTML so the first 10 posts are visible with no client
 * JavaScript having to run.
 */
export const useInitialFeed = routeLoader$(async (): Promise<FeedPagePayload> => {
  const { getInitialFeed } = await import("../server/db.server");
  return getInitialFeed();
});

/**
 * RPC for subsequent pages. Lives entirely on the server; `better-sqlite3`
 * is only required inside this callback so it can never leak into the
 * browser bundle.
 */
export const fetchNextFeedPage = server$(async function (
  cursor: number,
): Promise<FeedPagePayload> {
  const { getFeedAfter } = await import("../server/db.server");
  return getFeedAfter(cursor);
});

export default component$(() => {
  const initial = useInitialFeed();

  const store = useStore<FeedStore>({
    posts: initial.value.posts,
    cursor:
      initial.value.posts.length > 0
        ? initial.value.posts[initial.value.posts.length - 1].id
        : 0,
    hasMore: initial.value.hasMore,
    loading: false,
    finished: !initial.value.hasMore,
  });

  const observer = useSignal<NoSerialize<IntersectionObserver> | undefined>(
    undefined,
  );

  const loadNext = $(async () => {
    if (store.loading || store.finished || !store.hasMore) return;
    store.loading = true;
    try {
      const page = await fetchNextFeedPage(store.cursor);
      if (page.posts.length === 0) {
        store.hasMore = false;
        store.finished = true;
        return;
      }
      for (const post of page.posts) {
        store.posts.push(post);
      }
      store.cursor = page.posts[page.posts.length - 1].id;
      store.hasMore = page.hasMore;
      if (!page.hasMore) {
        store.finished = true;
      }
    } finally {
      store.loading = false;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const sentinel = document.querySelector<HTMLElement>(
      '[data-testid="feed-sentinel"]',
    );
    if (!sentinel) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Fire and forget – `loadNext` handles its own loading flag.
            void loadNext();
          }
        }
      },
      { rootMargin: "100px" },
    );
    io.observe(sentinel);
    observer.value = noSerialize(io);

    cleanup(() => {
      io.disconnect();
    });
  });

  return (
    <main style={{ maxWidth: "640px", margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Infinite Feed</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {store.posts.map((post) => (
          <li
            key={post.id}
            data-testid="feed-item"
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "0.75rem",
            }}
          >
            <h2 style={{ margin: "0 0 0.5rem" }}>{post.title}</h2>
            <p style={{ margin: 0, color: "#444" }}>{post.body}</p>
          </li>
        ))}
      </ul>

      {store.hasMore && !store.finished && (
        <div
          data-testid="feed-sentinel"
          style={{ height: "1px", width: "100%" }}
        />
      )}

      {store.loading && (
        <div
          data-testid="feed-loading"
          style={{ padding: "1rem", textAlign: "center" }}
        >
          Loading more posts…
        </div>
      )}

      {store.finished && (
        <div
          data-testid="feed-end"
          style={{ padding: "1rem", textAlign: "center", fontWeight: 600 }}
        >
          End of feed – all {store.posts.length} posts loaded.
        </div>
      )}
    </main>
  );
});

export const head: DocumentHead = {
  title: "Infinite Feed",
  meta: [
    {
      name: "description",
      content: "Qwik City infinite-scroll feed backed by SQLite.",
    },
  ],
};
