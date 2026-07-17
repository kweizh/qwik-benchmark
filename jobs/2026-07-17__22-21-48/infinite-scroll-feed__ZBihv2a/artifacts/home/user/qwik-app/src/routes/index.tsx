import { component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { routeLoader$, server$, type DocumentHead } from "@builder.io/qwik-city";
import {
  getFirstPage,
  getNextPage,
  type PageResult,
  type Post,
} from "../db/database.server";

/**
 * Initial page is produced on the server and embedded in the SSR HTML, so the
 * first 10 posts are visible without any client JavaScript.
 */
export const useFeed = routeLoader$(() => {
  return getFirstPage();
});

/**
 * RPC used by the client to load every subsequent page. It accepts the cursor
 * (the id of the last item already loaded) and returns the next page plus
 * whether more posts remain. All database access stays inside this server
 * function, so nothing Node-only reaches the browser.
 */
export const loadMore = server$(function (cursor: number): PageResult {
  return getNextPage(cursor);
});

export default component$(() => {
  const initial = useFeed();

  const state = useStore<{
    posts: Post[];
    loading: boolean;
    hasMore: boolean;
    done: boolean;
  }>({
    posts: [...initial.value.posts],
    loading: false,
    hasMore: initial.value.hasMore,
    done: !initial.value.hasMore,
  });

  const sentinel = useSignal<HTMLElement>();

  useVisibleTask$(({ cleanup }) => {
    let observer: IntersectionObserver | undefined;

    const loadNext = async () => {
      // Guard against overlapping fetches and fetching past the end.
      if (state.loading || !state.hasMore) {
        return;
      }
      state.loading = true;

      const lastId = state.posts.length
        ? state.posts[state.posts.length - 1].id
        : 0;

      try {
        const result = await loadMore(lastId);
        // Append only newly fetched posts (cursor guarantees no duplicates).
        state.posts.push(...result.posts);
        state.hasMore = result.hasMore;
        if (!result.hasMore) {
          state.done = true;
          observer?.disconnect();
        }
      } finally {
        state.loading = false;
      }
    };

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          loadNext();
        }
      }
    });

    if (sentinel.value) {
      observer.observe(sentinel.value);
    }

    cleanup(() => observer?.disconnect());
  });

  return (
    <main class="feed">
      <header class="feed__header">
        <h1>Infinite Feed</h1>
        <p>Scroll down to load more posts.</p>
      </header>

      <ul class="feed__list">
        {state.posts.map((post) => (
          <li
            key={post.id}
            data-testid="feed-item"
            class="feed__item"
          >
            <h2 class="feed__item-title">{post.title}</h2>
            <p class="feed__item-body">{post.body}</p>
          </li>
        ))}
      </ul>

      {/* Loading indicator: present in the DOM only while a page is fetched. */}
      {state.loading && (
        <div data-testid="feed-loading" class="feed__loading">
          Loading more posts…
        </div>
      )}

      {/* End-of-feed indicator: shown once the last post has been loaded. */}
      {state.done && (
        <div data-testid="feed-end" class="feed__end">
          End of feed
        </div>
      )}

      {/* Sentinel watched by the IntersectionObserver. */}
      <div
        data-testid="feed-sentinel"
        ref={sentinel}
        class="feed__sentinel"
      />
    </main>
  );
});

export const head: DocumentHead = {
  title: "Infinite Feed",
  meta: [
    {
      name: "description",
      content: "An infinite-scroll feed built with Qwik City and SQLite.",
    },
  ],
};