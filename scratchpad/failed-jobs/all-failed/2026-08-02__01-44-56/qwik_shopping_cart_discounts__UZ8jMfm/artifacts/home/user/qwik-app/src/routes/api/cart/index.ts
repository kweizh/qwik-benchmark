import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb, calculateCartState, mutateCart } from "../../../db";

export const onGet: RequestHandler = async ({ json }) => {
  const db = getDb();
  const cartState = calculateCartState(db);
  json(200, cartState);
};

export const onPost: RequestHandler = async ({ json, parseBody }) => {
  const db = getDb();
  const body = await parseBody();
  const cartState = mutateCart(db, body);
  json(200, cartState);
};
