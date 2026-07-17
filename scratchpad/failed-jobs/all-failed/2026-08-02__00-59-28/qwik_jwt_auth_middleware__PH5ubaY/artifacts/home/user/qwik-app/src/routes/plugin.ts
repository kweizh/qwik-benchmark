import type { RequestHandler } from "@builder.io/qwik-city";
import { verifyJwt } from "../lib/jwt";

export const onRequest: RequestHandler = async ({ pathname, cookie, redirect, next }) => {
  // Only protect /admin/* routes
  if (pathname.startsWith("/admin")) {
    const token = cookie.get("jwt_token");
    if (!token) {
      throw redirect(302, "/login");
    }

    const payload = await verifyJwt(token.value);
    if (!payload || payload.role !== "admin") {
      throw redirect(302, "/login");
    }
  }

  // For non-admin routes, just continue
  await next();
};
