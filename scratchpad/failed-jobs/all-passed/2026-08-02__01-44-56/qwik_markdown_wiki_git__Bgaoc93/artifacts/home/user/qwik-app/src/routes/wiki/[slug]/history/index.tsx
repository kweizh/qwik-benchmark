import { type RequestHandler } from '@builder.io/qwik-city';
import { getRevisions } from '~/lib/db';

export const onGet: RequestHandler = async (requestEvent) => {
  const { params, json } = requestEvent;
  const slug = params.slug;

  const revisions = getRevisions(slug);
  throw json(200, revisions);
};
