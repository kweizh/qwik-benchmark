import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { getUserByEmail } from "../../db";

export const useProfileLoader = routeLoader$(({ cookie, redirect, status }) => {
  const sessionEmail = cookie.get("session_email")?.value;
  if (!sessionEmail) {
    throw redirect(302, "/unauthorized");
  }

  const user = getUserByEmail(sessionEmail);
  if (!user) {
    throw redirect(302, "/unauthorized");
  }

  if (user.role !== "ADMIN" && user.role !== "USER") {
    throw redirect(302, "/unauthorized");
  }

  status(200);
  return {
    name: user.name,
    email: user.email,
    role: user.role,
  };
});

export default component$(() => {
  const profile = useProfileLoader();

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>User Profile</h1>
      <div style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "5px", maxWidth: "400px" }}>
        <p><strong>Name:</strong> {profile.value.name}</p>
        <p><strong>Email:</strong> {profile.value.email}</p>
        <p><strong>Role:</strong> {profile.value.role}</p>
      </div>
      <p style={{ marginTop: "20px" }}>
        <a href="/" style={{ color: "blue", textDecoration: "underline" }}>Go back home</a>
      </p>
    </div>
  );
});
