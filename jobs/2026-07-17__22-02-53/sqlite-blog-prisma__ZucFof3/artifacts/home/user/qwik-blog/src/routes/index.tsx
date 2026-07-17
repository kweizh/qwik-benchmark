import { component$ } from "@builder.io/qwik";
import { Form, routeAction$, routeLoader$, z, zod$ } from "@builder.io/qwik-city";
import { prisma } from "../db.server";
import type { DocumentHead } from "@builder.io/qwik-city";

export const usePostsLoader = routeLoader$(async () => {
  return await prisma.post.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
});

export const useCreatePostAction = routeAction$(
  async (data) => {
    const post = await prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
      },
    });
    return post;
  },
  zod$({
    title: z.string().min(3, "Title must be at least 3 characters"),
    content: z.string().min(10, "Content must be at least 10 characters"),
  })
);

export default component$(() => {
  const postsSignal = usePostsLoader();
  const createPostAction = useCreatePostAction();

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Qwik City Blog</h1>

      <section style={{ marginBottom: "40px", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h2>Create a New Post</h2>
        <Form action={createPostAction} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label for="title" style={{ fontWeight: "bold" }}>Title</label>
            <input
              id="title"
              name="title"
              type="text"
              value={createPostAction.formData?.get("title")?.toString() ?? ""}
              style={{ padding: "8px", fontSize: "16px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
            {createPostAction.value?.fieldErrors?.title && (
              <span style={{ color: "red", fontSize: "14px" }}>
                {createPostAction.value.fieldErrors.title}
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label for="content" style={{ fontWeight: "bold" }}>Content</label>
            <textarea
              id="content"
              name="content"
              rows={5}
              style={{ padding: "8px", fontSize: "16px", borderRadius: "4px", border: "1px solid #ccc" }}
            >{createPostAction.formData?.get("content")?.toString() ?? ""}</textarea>
            {createPostAction.value?.fieldErrors?.content && (
              <span style={{ color: "red", fontSize: "14px" }}>
                {createPostAction.value.fieldErrors.content}
              </span>
            )}
          </div>

          <div>
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                backgroundColor: "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {createPostAction.isRunning ? "Creating..." : "Create Post"}
            </button>
          </div>
        </Form>
      </section>

      <section>
        <h2>All Posts</h2>
        {postsSignal.value.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {postsSignal.value.map((post) => (
              <article key={post.id} style={{ padding: "15px", border: "1px solid #eaeaea", borderRadius: "6px" }}>
                <h3 style={{ margin: "0 0 10px 0" }}>
                  <a href={`/posts/${post.id}`} style={{ color: "#0070f3", textDecoration: "none" }}>
                    {post.title}
                  </a>
                </h3>
                <p style={{ margin: "0 0 10px 0", color: "#666", fontSize: "14px" }}>
                  Published on {new Date(post.createdAt).toLocaleDateString()}
                </p>
                <p style={{ margin: "0", whiteSpace: "pre-wrap" }}>
                  {post.content.length > 150 ? `${post.content.substring(0, 150)}...` : post.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik City SQLite Blog",
  meta: [
    {
      name: "description",
      content: "A local SQLite-backed blog built with Qwik City and Prisma.",
    },
  ],
};
