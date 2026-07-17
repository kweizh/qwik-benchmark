import { z } from "zod";
import type { RequestEvent } from "@builder.io/qwik-city";

/**
 * A small wrapper around a zod schema that, in addition to the standard
 * `{ fieldErrors, formErrors }` failure shape, also exposes the **submitted
 * form values** under `error.values`. This lets the wizard re-render the form
 * with whatever the user just typed, even when the validator rejects the
 * payload and the action handler is never invoked.
 *
 * Usage:
 *   zodWithValues$((z) => z.object({...}).refine(...))
 */
export function zodWithValues$(
  buildSchema: (zod: typeof z) => z.ZodTypeAny,
): {
  __brand: "zod_with_values";
  validate: (
    ev: RequestEvent,
    inputData?: unknown,
  ) => Promise<
    | { success: true; data: unknown }
    | {
        success: false;
        status: number;
        error: {
          failed: true;
          formErrors: string[];
          fieldErrors: Record<string, string>;
          values: Record<string, unknown>;
        };
      }
  >;
} {
  return {
    __brand: "zod_with_values",
    async validate(ev, inputData) {
      const schema = buildSchema(z);
      const data =
        inputData !== undefined ? inputData : await ev.parseBody();
      const result = await schema.safeParseAsync(data);
      if (result.success) {
        return { success: true, data: result.data };
      }
      const fieldErrors: Record<string, string> = {};
      const formErrors: string[] = [];
      for (const issue of result.error.issues) {
        if (issue.path.length === 0) {
          formErrors.push(issue.message);
          continue;
        }
        // Use the first error per field so the UI shows a single message.
        const key = issue.path
          .map((segment) => (typeof segment === "number" ? "*" : segment))
          .join(".");
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      const values: Record<string, unknown> = {};
      if (data && typeof data === "object" && !Array.isArray(data)) {
        for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
          // Never echo passwords back to the browser.
          if (k === "password" || k === "confirmPassword") continue;
          values[k] = v;
        }
      }
      return {
        success: false,
        status: 400,
        error: {
          failed: true,
          formErrors,
          fieldErrors,
          values,
        },
      };
    },
  };
}