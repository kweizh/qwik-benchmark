import { component$ } from '@builder.io/qwik';
import {
  Link,
  routeLoader$,
  type DocumentHead,
} from '@builder.io/qwik-city';
import { findArticleBySlug, type ArticleDetail } from '~/lib/db';

export const useArticleLoader = routeLoader$<ArticleDetail | null>(
  async ({ params, status }) => {
    const slug = params.slug;
    const article = findArticleBySlug(slug);
    if (!article) {
      status(404);
      return null;
    }
    return article;
  }
);

export default component$(() => {
  const data = useArticleLoader();
  const article = data.value;

  if (!article) {
    return (
      <div>
        <h1>Article not found</h1>
        <p>
          <Link href="/articles">Back to articles</Link>
        </p>
      </div>
    );
  }

  return (
    <article data-article={article.slug}>
      <h1>{article.title}</h1>
      <p>
        <Link href="/articles">&larr; Back to articles</Link>
      </p>
      <h2>Tags</h2>
      <ul class="tag-list">
        {article.tags.map((tag) => (
          <li key={tag} data-tag={tag}>
            {tag}
          </li>
        ))}
      </ul>
    </article>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const article = resolveValue(useArticleLoader);
  return {
    title: article ? article.title : 'Article not found',
  };
};