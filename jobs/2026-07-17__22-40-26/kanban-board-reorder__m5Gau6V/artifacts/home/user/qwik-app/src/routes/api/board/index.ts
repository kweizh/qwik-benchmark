import type { RequestHandler } from "@builder.io/qwik-city";
import { readBoard } from "~/lib/db";

export const onGet: RequestHandler = async ({ json, status }) => {
  status(200);
  json(200, readBoard());
};
