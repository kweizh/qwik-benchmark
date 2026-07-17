import { component$ } from "@builder.io/qwik";
import { routeLoader$, Link, type DocumentHead } from "@builder.io/qwik-city";
import {
  findArticlesByTags,
  getFacetCounts,
  type ArticleRow,
  type FacetCount,
} from "~/lib/db";

export interface ArticlesData {
  articles: ArticleRow[];
  facets: FacetCount[];
  selectedTags: string[];
}

export const useArticlesLoader = routeLoader$<ArticlesData>((requestEvent) => {
  const selectedTags = requestEvent.url.searchParams.getAll("tag");

  const articles = findArticlesByTags(selectedTags);
  const facets = getFacetCounts(articles.map((a) => a.id));

  return {
    articles,
    facets,
    selectedTags,
  };
});

function tagHref(currentTags: string[], tag: string): string {
  const isActive = currentTags.includes(tag);
  const nextTags = isActive
    ? currentTags.filter((t) => t !== tag)
    : [...currentTags, tag];

  if (nextTags.length === 0) {
    return "/articles";
  }

  const params = new URLSearchParams();
  for (const t of nextTags) {
    params.append("tag", t);
  }
  return `/articles?${params.toString()}`;
}

export default component$(() => {
  const data = useArticlesLoader();
  const { articles, facets, selectedTags } = data.value;

  return (
    <div class="articles-page">
      <h1>Articles</h1>

      <section class="tag-filters">
        <h2>Filter by tag</h2>
        <ul class="tag-list">
          {facets.map((facet) => {
            const isActive = selectedTags.includes(facet.name);
            return (
              <li key={facet.name}>
                <Link
                  href={tagHref(selectedTags, facet.name)}
                  data-facet={facet.name}
                  data-count={facet.count}
                  class={isActive ? "tag active" : "tag"}
                >
                  {facet.name} ({facet.count})
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section class="active-filters">
        {selectedTags.length > 0 ? (
          <p>
            Active filters:{" "}
            {selectedTags.map((tag) => (
              <span key={tag} data-active-tag={tag} class="active-tag">
                {tag}
              </span>
            ))}
          </p>
        ) : (
          <p>No filters active — showing all articles.</p>
        )}
      </section>

      <ul class="article-list">
        {articles.map((article) => (
          <li key={article.slug} data-article={article.slug} class="article">
            <a href={`/articles/${article.slug}`}>{article.title}</a>
          </li>
        ))}
      </ul>

      {articles.length === 0 && <p class="empty-state">No articles match the selected tags.</p>}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Articles",
  meta: [
    {
      name: "description",
      content: "Tag-filterable article listing",
    },
  ],
};
