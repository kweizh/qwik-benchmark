import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { prisma } from "../../../db.server";
import type { DocumentHead } from "@builder.io/qwik-city";

export const usePostLoader = routeLoader$(async (ev) => {
  const { id } = ev.params;
  const postId = Number.parseInt(id, 10);

  if (isNaN(postId)) {
    ev.status(404);
    return ev.fail(404, { message: "Post not found" });
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    ev.status(404);
    return ev.fail(404, { message: "Post not found" });
  }

  return post;
});

export default component$(() => {
  const postSignal = usePostLoader();

  if (postSignal.value.failed) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
        <h1>404: Post Not Found</h1>
        <p>The post you are looking for does not exist.</p>
        <p>
          <a href="/" style={{ color: "#0070f3", textDecoration: "none" }}>
            Back to Home
          </a>
        </p>
      </div>
    );
  }

  const post = postSignal.value;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <p>
        <a href="/" style={{ color: "#0070f3", textDecoration: "none" }}>
          &larr; Back to Home
        </a>
      </p>
      <article style={{ marginTop: "20px" }}>
        <h1 style={{ fontSize: "32px", margin: "0 0 10px 0" }}>{post.title}</h1>
        <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>
          Published on {new Date(post.createdAt).toLocaleDateString()}
        </p>
        <div style={{ fontSize: "18px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
          {post.content}
        </div>
      </article>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const post = resolveValue(usePostLoader);
  if (post && !("failed" in post)) {
    return {
      title: post.title,
      meta: [
        {
          name: "description",
          content: post.content.substring(0, 150),
        },
      ],
    };
  }
  return {
    title: "Post Not Found",
  };
};
