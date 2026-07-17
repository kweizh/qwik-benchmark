import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getDb } from "~/lib/db";

export const usePost = routeLoader$(async (requestEvent) => {
  const idParam = requestEvent.params.id;
  const id = Number(idParam);

  if (!Number.isInteger(id)) {
    requestEvent.status(404);
    return null;
  }

  const prisma = getDb();
  const post = await prisma.post.findUnique({ where: { id } });

  if (!post) {
    requestEvent.status(404);
    return null;
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

  if (!post.value) {
    return (
      <>
        <h1>Post Not Found</h1>
        <p>We couldn't find the post you're looking for.</p>
        <a href="/">Back to home</a>
      </>
    );
  }

  return (
    <>
      <h1>{post.value.title}</h1>
      <p>{post.value.content}</p>
      <a href="/">Back to home</a>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const post = resolveValue(usePost);
  return {
    title: post ? post.title : "Post Not Found",
  };
};
