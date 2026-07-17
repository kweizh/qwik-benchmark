import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getArticleBySlug, getTagsForArticle } from "~/lib/db";

export interface ArticleDetailData {
  slug: string;
  title: string;
  tags: string[];
}

export const useArticleLoader = routeLoader$<ArticleDetailData>((requestEvent) => {
  const slug = requestEvent.params.slug;
  const article = getArticleBySlug(slug);

  if (!article) {
    throw requestEvent.error(404, `Article "${slug}" not found`);
  }

  const tags = getTagsForArticle(article.id);

  return {
    slug: article.slug,
    title: article.title,
    tags,
  };
});

export default component$(() => {
  const data = useArticleLoader();
  const { title, tags } = data.value;

  return (
    <div class="article-detail">
      <p>
        <a href="/articles">&larr; Back to articles</a>
      </p>
      <h1>{title}</h1>
      <h2>Tags</h2>
      <ul class="tag-list">
        {tags.map((tag) => (
          <li key={tag} data-tag={tag}>
            {tag}
          </li>
        ))}
      </ul>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useArticleLoader);
  return {
    title: data.title,
    meta: [
      {
        name: "description",
        content: `Tags for ${data.title}`,
      },
    ],
  };
};
