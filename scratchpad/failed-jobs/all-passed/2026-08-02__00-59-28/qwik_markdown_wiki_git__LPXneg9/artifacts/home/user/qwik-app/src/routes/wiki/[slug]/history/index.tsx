import { getRevisions } from "~/db";
import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = ({ params, json }) => {
  const slug = params.slug;
  const revisions = getRevisions(slug);
  json(200, revisions);
};
