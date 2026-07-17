import type { RequestHandler } from "@builder.io/qwik-city";
import { castVote } from "../../../../db";

export const onPost: RequestHandler = async (event) => {
  const pollId = event.params.id;

  let body: any;
  try {
    body = await event.request.json();
  } catch (err) {
    event.json(400, { error: "Invalid option ID" });
    return;
  }

  if (!body || typeof body !== "object") {
    event.json(400, { error: "Invalid option ID" });
    return;
  }

  const optionId = body.optionId;
  if (optionId === undefined || optionId === null || typeof optionId !== "number" || !Number.isInteger(optionId)) {
    event.json(400, { error: "Invalid option ID" });
    return;
  }

  // Extract IP address from X-Forwarded-For or fall back to connection IP
  const xForwardedFor = event.request.headers.get("x-forwarded-for");
  let ip = "";
  if (xForwardedFor) {
    ip = xForwardedFor.split(",")[0].trim();
  } else {
    ip = event.clientConn.ip || "127.0.0.1";
  }

  try {
    const result = castVote(ip, pollId, optionId);
    if (!result.success) {
      if (result.error === "rate_limit") {
        event.json(429, { error: "Rate limit exceeded" });
        return;
      } else if (result.error === "not_found") {
        event.json(404, { error: "Poll or option not found" });
        return;
      }
    }

    event.json(200, {
      success: true,
      votes: result.votes,
    });
  } catch (err) {
    console.error("Error casting vote:", err);
    event.json(500, { error: "Internal server error" });
  }
};
