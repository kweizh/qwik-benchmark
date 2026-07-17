import type { RequestHandler } from "@builder.io/qwik-city";
import { getAllExecutionHistory } from "../../../../db";

export const onGet: RequestHandler = async ({ json }) => {
  const history = getAllExecutionHistory();
  json(200, history);
};
