import { component$, Slot } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <>
      <header class="site-header">
        <nav>
          <Link href="/notes" class="brand">
            📝 Markdown Notes
          </Link>
        </nav>
      </header>
      <main class="site-main">
        <Slot />
      </main>
      <footer class="site-footer">
        <small>Stored locally in SQLite · rendered with marked + sanitize-html</small>
      </footer>
    </>
  );
});