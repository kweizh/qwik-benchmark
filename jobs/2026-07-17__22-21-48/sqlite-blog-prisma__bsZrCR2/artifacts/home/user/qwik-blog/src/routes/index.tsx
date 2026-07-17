import { component$ } from "@builder.io/qwik";
import {
  type DocumentHead,
  Form,
  routeAction$,
  routeLoader$,
  z,
  zod$,
} from "@builder.io/qwik-city";
import { prisma } from "../db.server";

// Load ALL posts on the server, newest first.
export const usePosts = routeLoader$(async () => {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
  });
  // Serialize dates to strings so the data is safely transportable.
  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    createdAt: p.createdAt.toISOString(),
  }));
});

// Progressive-enhancement form action that creates a new post.
export const useCreatePost = routeAction$(
  async (data, event) => {
    const post = await prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
      },
    });

    // Redirect to the home page so the new post shows up in the list.
    throw event.redirect(302, `/`);
    return post;
  },
  zod$({
    title: z.string().min(3, "Title must be at least 3 characters"),
    content: z.string().min(10, "Content must be at least 10 characters"),
  }),
);

export default component$(() => {
  const posts = usePosts();
  const createAction = useCreatePost();

  return (
    <main>
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
        <h2>Create a new post</h2>
        {/* `reloadDocument` ensures this works as a normal HTML form POST,
            even without client-side JavaScript (progressive enhancement). */}
        <Form action={createAction} reloadDocument>
          <label>
            Title
            <input type="text" name="title" required minLength={3} />
          </label>
          {createAction.value?.fieldErrors.title && (
            <p>{createAction.value.fieldErrors.title}</p>
          )}
          <label>
            Content
            <input type="text" name="content" required minLength={10} />
          </label>
          {createAction.value?.fieldErrors.content && (
            <p>{createAction.value.fieldErrors.content}</p>
          )}
          <button type="submit">Create post</button>
        </Form>
      </section>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Qwik Blog",
  meta: [
    {
      name: "description",
      content: "A small blog built with Qwik City and Prisma (SQLite).",
    },
  ],
};