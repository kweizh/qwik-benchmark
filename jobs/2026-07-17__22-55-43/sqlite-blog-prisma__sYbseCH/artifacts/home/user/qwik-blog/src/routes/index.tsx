import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  routeAction$,
  zod$,
  z,
  Form,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { getDb } from "~/lib/db";

export const useAllPosts = routeLoader$(async () => {
  const prisma = getDb();
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
  });
  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
  }));
});

export const useCreatePost = routeAction$(
  async (data) => {
    const prisma = getDb();
    const post = await prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
      },
    });
    return { success: true, id: post.id };
  },
  zod$({
    title: z.string().trim().min(3, "Title must be at least 3 characters"),
    content: z
      .string()
      .trim()
      .min(10, "Content must be at least 10 characters"),
  })
);

export default component$(() => {
  const posts = useAllPosts();
  const createPost = useCreatePost();

  return (
    <>
      <h1>Qwik Blog</h1>

      <section>
        <h2>Posts</h2>
        <ul>
          {posts.value.map((post) => (
            <li key={post.id}>
              <a href={`/posts/${post.id}`}>{post.title}</a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>New Post</h2>
        <Form action={createPost}>
          <div>
            <label for="title">Title</label>
            <input id="title" name="title" type="text" />
            {createPost.value?.fieldErrors?.title && (
              <p class="error">{createPost.value.fieldErrors.title}</p>
            )}
          </div>
          <div>
            <label for="content">Content</label>
            <textarea id="content" name="content" />
            {createPost.value?.fieldErrors?.content && (
              <p class="error">{createPost.value.fieldErrors.content}</p>
            )}
          </div>
          <button type="submit">Create Post</button>
        </Form>
      </section>
    </>
  );
});

export const head: DocumentHead = {
  title: "Qwik Blog",
  meta: [
    {
      name: "description",
      content: "A small blog built with Qwik City and Prisma + SQLite.",
    },
  ],
};
