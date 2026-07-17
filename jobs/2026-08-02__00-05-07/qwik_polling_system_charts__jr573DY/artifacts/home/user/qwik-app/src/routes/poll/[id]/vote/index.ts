import type { RequestHandler } from "@builder.io/qwik-city";
import { castVote } from "~/lib/db";

/**
 * Resolves the client's IP address.
 *
 * Prefers the first entry of `X-Forwarded-For` (useful when running behind a
 * proxy/load balancer), falling back to the underlying connection's IP.
 */
function getClientIp(request: Request, connIp: string | undefined): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return connIp || "unknown";
}

export const onPost: RequestHandler = async (requestEvent) => {
  const pollId = requestEvent.params.id;

  let body: unknown = null;
  try {
    body = await requestEvent.request.json();
  } catch {
    body = null;
  }

  const optionId =
    body && typeof body === "object" ? (body as Record<string, unknown>).optionId : undefined;

  if (
    typeof optionId !== "number" ||
    !Number.isInteger(optionId) ||
    !Number.isFinite(optionId)
  ) {
    requestEvent.json(400, { error: "Invalid option ID" });
    return;
  }

  const ip = getClientIp(requestEvent.request, requestEvent.clientConn.ip);

  const result = castVote(pollId, optionId, ip);

  if (!result.ok) {
    if (result.reason === "not_found") {
      requestEvent.json(404, { error: "Poll or option not found" });
      return;
    }
    // result.reason === "rate_limited"
    requestEvent.json(429, { error: "Rate limit exceeded" });
    return;
  }

  requestEvent.json(200, { success: true, votes: result.votes });
};
