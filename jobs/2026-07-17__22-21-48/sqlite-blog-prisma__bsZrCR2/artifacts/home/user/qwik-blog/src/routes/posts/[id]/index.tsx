import { component$ } from "@builder.io/qwik";
import { type DocumentHead, routeLoader$ } from "@builder.io/qwik-city";
import { prisma } from "../../../db.server";

// Fetch a single post by id on the server. Respond with 404 if missing.
export const usePost = routeLoader$(async (event) => {
  const id = Number(event.params.id);
  if (Number.isNaN(id)) {
    throw event.error(404, "Post not found");
  }
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    throw event.error(404, "Post not found");
  }
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
  };
});

export default component$(() => {
  const post = usePost();
  return (
    <main>
      <p>
        <a href="/">← Back to all posts</a>
      </p>
      <article>
        <h1>{post.value.title}</h1>
        <p>{post.value.content}</p>
      </article>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Post",
};