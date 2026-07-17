import type { RequestHandler } from "@builder.io/qwik-city";
import { startRunner } from "../runner";

let started = false;

export const onRequest: RequestHandler = async () => {
  if (!started) {
    started = true;
    startRunner();
  }
};
