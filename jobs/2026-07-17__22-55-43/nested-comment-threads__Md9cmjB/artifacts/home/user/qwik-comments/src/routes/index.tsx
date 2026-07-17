import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  routeAction$,
  zod$,
  z,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { addComment, buildCommentTree, getAllComments } from "~/lib/db";
import { Comment } from "~/components/comment/comment";
import { ReplyForm } from "~/components/reply-form/reply-form";

export const useCommentsLoader = routeLoader$(() => {
  const rows = getAllComments();
  return buildCommentTree(rows);
});

export const useAddCommentAction = routeAction$(
  async (data) => {
    const parentId =
      data.parentId && data.parentId.trim().length > 0
        ? Number(data.parentId)
        : null;

    const comment = addComment(parentId, data.author, data.body);
    return { success: true, id: comment.id };
  },
  zod$({
    parentId: z.string().optional(),
    author: z.string().min(1, "Author is required"),
    body: z.string().min(1, "Comment body is required"),
  }),
);

export default component$(() => {
  const comments = useCommentsLoader();
  const action = useAddCommentAction();

  return (
    <div class="page">
      <h1>Comments</h1>

      <section class="new-comment">
        <h2>Add a new comment</h2>
        <ReplyForm parentId={null} action={action} label="Post comment" />
      </section>

      <ul class="comment-list">
        {comments.value.map((comment) => (
          <Comment key={comment.id} comment={comment} depth={0} action={action} />
        ))}
      </ul>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Nested Comments",
  meta: [
    {
      name: "description",
      content: "A nested comment thread demo built with Qwik City and SQLite.",
    },
  ],
};
