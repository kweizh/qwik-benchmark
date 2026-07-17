import type { RequestHandler } from "@builder.io/qwik-city";
import { verifyJwt } from "../utils/jwt";

export const onRequest: RequestHandler = async (event) => {
  const pathname = event.url.pathname;
  
  // Check if request is to /admin or /admin/*
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const jwtCookie = event.cookie.get("jwt_token");
    const token = jwtCookie ? jwtCookie.value : null;
    
    if (!token) {
      throw event.redirect(302, "/login");
    }
    
    const payload = verifyJwt(token, "secret_key_123");
    if (!payload || payload.role !== "admin") {
      throw event.redirect(302, "/login");
    }
  }
};
