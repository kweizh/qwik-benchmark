import { component$ } from "@builder.io/qwik";
import { Form, type ActionStore } from "@builder.io/qwik-city";

export interface AddCommentActionInput {
  parentId?: string;
  author: string;
  body: string;
}

export interface AddCommentActionOutput {
  success: boolean;
}

interface ReplyFormProps {
  parentId: number | null;
  action: ActionStore<AddCommentActionOutput, AddCommentActionInput>;
  label?: string;
}

export const ReplyForm = component$<ReplyFormProps>(
  ({ parentId, action, label }) => {
    const parentIdValue = parentId == null ? "" : String(parentId);

    const submittedParentId = action.formData?.get("parentId") ?? null;
    const isThisForm = submittedParentId === parentIdValue;
    const failure =
      action.value && "failed" in action.value && action.value.failed
        ? (action.value as any)
        : undefined;
    const errors = isThisForm ? failure : undefined;

    return (
      <Form action={action} spaReset class="reply-form">
        <input type="hidden" name="parentId" value={parentIdValue} />
        <div class="field">
          <label>
            Name
            <input type="text" name="author" placeholder="Your name" />
          </label>
          {errors?.fieldErrors?.author && (
            <div class="error" data-testid={`error-author-${parentIdValue || "root"}`}>
              {errors.fieldErrors.author}
            </div>
          )}
        </div>
        <div class="field">
          <label>
            {label ?? "Reply"}
            <textarea name="body" placeholder="Write your comment..." />
          </label>
          {errors?.fieldErrors?.body && (
            <div class="error" data-testid={`error-body-${parentIdValue || "root"}`}>
              {errors.fieldErrors.body}
            </div>
          )}
        </div>
        <button type="submit">{label ?? "Reply"}</button>
      </Form>
    );
  },
);
