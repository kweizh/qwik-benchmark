import { component$ } from "@builder.io/qwik";
import {
  type RequestHandler,
  type DocumentHead,
  routeLoader$,
  routeAction$,
  z,
  zod$,
} from "@builder.io/qwik-city";
import {
  getCommentsForPost,
  createComment,
  ParentNotFoundError,
  type CommentTree,
} from "../../../../lib/db";
import { CommentList } from "../../../../components/comment-list";

// Load comments data for HTML rendering
export const useCommentsLoader = routeLoader$(({ params }) => {
  return {
    comments: getCommentsForPost(params.id),
    postId: params.id,
  };
});

// GET handler: content negotiation for JSON API
export const onGet: RequestHandler = async (ev) => {
  const acceptHeader = ev.request.headers.get("Accept") || "";

  if (acceptHeader.includes("application/json")) {
    const postId = ev.params.id;
    const comments = getCommentsForPost(postId);
    ev.json(200, comments);
  }
  // If not JSON, let the request continue to component render
};

// POST handler: JSON API for creating comments
export const onPost: RequestHandler = async (ev) => {
  const contentType = ev.request.headers.get("Content-Type") || "";

  // If it's a Qwik action (form submission), let the action middleware handle it
  if (ev.query.has("qaction")) {
    return;
  }

  // Only handle JSON API calls
  if (!contentType.includes("application/json")) {
    // Let form submissions fall through to the action middleware
    return;
  }

  const postId = ev.params.id;

  let body: { parentId?: number | null; text?: string; author?: string };
  try {
    body = await ev.request.json();
  } catch {
    ev.json(400, { error: "Invalid JSON body" });
    return;
  }

  if (!body || typeof body !== "object") {
    ev.json(400, { error: "Request body must be a JSON object" });
    return;
  }

  const { parentId, text, author } = body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    ev.json(400, { error: "text is required and must be a non-empty string" });
    return;
  }

  if (!author || typeof author !== "string" || author.trim().length === 0) {
    ev.json(400, {
      error: "author is required and must be a non-empty string",
    });
    return;
  }

  const normalizedParentId =
    parentId === undefined || parentId === null ? null : parentId;

  if (
    normalizedParentId !== null &&
    (typeof normalizedParentId !== "number" ||
      !Number.isInteger(normalizedParentId))
  ) {
    ev.json(400, {
      error: "parentId must be an integer or null",
    });
    return;
  }

  try {
    const comment = createComment(
      postId,
      normalizedParentId,
      text.trim(),
      author.trim()
    );
    ev.json(201, comment);
  } catch (err) {
    if (err instanceof ParentNotFoundError) {
      ev.json(404, { error: err.message });
    } else {
      ev.json(500, { error: "Internal server error" });
    }
  }
};

// Form action for creating comments via the HTML form
export const useAddComment = routeAction$(
  async (data, { params }) => {
    const parentIdRaw = data.parentId;
    const normalizedParentId =
      parentIdRaw === undefined || parentIdRaw === null || parentIdRaw === ""
        ? null
        : Number(parentIdRaw);

    if (
      normalizedParentId !== null &&
      (!Number.isInteger(normalizedParentId) || normalizedParentId < 1)
    ) {
      return {
        success: false,
        error: "Invalid parent ID",
      };
    }

    try {
      const comment = createComment(
        params.id,
        normalizedParentId,
        data.text as string,
        data.author as string
      );
      return { success: true, comment };
    } catch (err) {
      if (err instanceof ParentNotFoundError) {
        return { success: false, error: err.message };
      }
      return { success: false, error: "Internal server error" };
    }
  },
  zod$({
    text: z.string().min(1, "Text is required"),
    author: z.string().min(1, "Author is required"),
    parentId: z.string().optional(),
  })
);

export const head: DocumentHead = {
  title: "Comments",
};

export default component$(() => {
  const loaderSignal = useCommentsLoader();
  const addCommentAction = useAddComment();

  return (
    <div class="comments-page">
      <h1>Comments</h1>
      <CommentList
        comments={loaderSignal.value.comments}
        postId={loaderSignal.value.postId}
        addCommentAction={addCommentAction}
      />
    </div>
  );
});
