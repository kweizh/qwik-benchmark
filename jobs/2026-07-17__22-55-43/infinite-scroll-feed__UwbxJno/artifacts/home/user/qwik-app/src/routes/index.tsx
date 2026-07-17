import {
  $,
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import {
  routeLoader$,
  server$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { getFeedPage, type Post } from "~/lib/db.server";

export const useFeedLoader = routeLoader$(() => {
  return getFeedPage(0);
});

export const loadMorePosts = server$(function (cursor: number) {
  return getFeedPage(cursor);
});

interface FeedState {
  posts: Post[];
  hasMore: boolean;
  loading: boolean;
}

export default component$(() => {
  const initial = useFeedLoader();

  const feed = useStore<FeedState>({
    posts: [...initial.value.posts],
    hasMore: initial.value.hasMore,
    loading: false,
  });

  const sentinelRef = useSignal<HTMLDivElement>();

  const appendPosts = $((incoming: Post[]) => {
    const existingIds = new Set(feed.posts.map((p) => p.id));
    for (const post of incoming) {
      if (!existingIds.has(post.id)) {
        feed.posts.push(post);
        existingIds.add(post.id);
      }
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const sentinelEl = sentinelRef.value;
    if (!sentinelEl) {
      return;
    }

    let disposed = false;

    const loadNextPage = async () => {
      if (feed.loading || !feed.hasMore || disposed) {
        return;
      }
      feed.loading = true;
      try {
        const lastPost = feed.posts[feed.posts.length - 1];
        const cursor = lastPost ? lastPost.id : 0;
        const result = await loadMorePosts(cursor);
        if (disposed) {
          return;
        }
        await appendPosts(result.posts);
        feed.hasMore = result.hasMore;
      } finally {
        feed.loading = false;
      }
      if (!feed.hasMore) {
        observer.disconnect();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void loadNextPage();
          }
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    );

    observer.observe(sentinelEl);

    cleanup(() => {
      disposed = true;
      observer.disconnect();
    });
  });

  return (
    <div class="feed-container">
      <h1>Feed</h1>
      <ul class="feed-list">
        {feed.posts.map((post) => (
          <li key={post.id} data-testid="feed-item" class="feed-item">
            <h2>{post.title}</h2>
            <p>{post.body}</p>
          </li>
        ))}
      </ul>

      {feed.loading && (
        <div data-testid="feed-loading" class="feed-loading">
          Loading more posts…
        </div>
      )}

      {!feed.hasMore && !feed.loading && (
        <div data-testid="feed-end" class="feed-end">
          End of feed
        </div>
      )}

      {feed.hasMore && (
        <div
          ref={sentinelRef}
          data-testid="feed-sentinel"
          class="feed-sentinel"
        />
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Feed",
  meta: [
    {
      name: "description",
      content: "Infinite scroll feed powered by Qwik City and SQLite",
    },
  ],
};
