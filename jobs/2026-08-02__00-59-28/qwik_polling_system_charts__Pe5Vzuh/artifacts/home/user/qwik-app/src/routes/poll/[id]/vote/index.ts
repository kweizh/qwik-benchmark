import type { RequestHandler } from "@builder.io/qwik-city";
import { getPoll, getOptionById, castVoteWithRateLimit } from "~/lib/db";

export const onPost: RequestHandler = async ({ request, params, json }) => {
  const pollId = params.id;

  // Check if poll exists
  const poll = getPoll(pollId);
  if (!poll) {
    json(404, { error: "Poll or option not found" });
    return;
  }

  // Parse request body
  let body: { optionId?: number };
  try {
    body = await request.json();
  } catch {
    json(400, { error: "Invalid option ID" });
    return;
  }

  const optionId = body.optionId;
  if (typeof optionId !== "number" || isNaN(optionId) || !Number.isInteger(optionId)) {
    json(400, { error: "Invalid option ID" });
    return;
  }

  // Check if option exists and belongs to this poll
  const option = getOptionById(optionId);
  if (!option || option.poll_id !== pollId) {
    json(404, { error: "Poll or option not found" });
    return;
  }

  // Extract client IP
  const xForwardedFor = request.headers.get("X-Forwarded-For");
  let ip: string;
  if (xForwardedFor) {
    ip = xForwardedFor.split(",")[0].trim();
  } else {
    // Fall back to a default - in Qwik dev mode, we use a reasonable fallback
    ip = "127.0.0.1";
  }

  try {
    const updatedOptions = castVoteWithRateLimit(pollId, optionId, ip);

    // Build the votes response object
    const votes: Record<string, number> = {};
    for (const opt of updatedOptions) {
      votes[String(opt.id)] = opt.votes;
    }

    json(200, { success: true, votes });
  } catch (err: any) {
    if (err.message === "Rate limit exceeded") {
      json(429, { error: "Rate limit exceeded" });
      return;
    }
    if (err.message === "Poll or option not found") {
      json(404, { error: "Poll or option not found" });
      return;
    }
    json(500, { error: "Internal server error" });
  }
};
