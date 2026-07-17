import { type RequestHandler } from '@builder.io/qwik-city';
import { getCartState, handleCartAction } from '../../../utils/cart';

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const state = getCartState();
    json(200, state);
  } catch (error: any) {
    json(500, { error: error?.message || "Internal server error" });
  }
};

export const onPost: RequestHandler = async ({ parseBody, request, json }) => {
  try {
    let body: any;
    try {
      body = await parseBody();
    } catch {
      // fallback to request.json() if parseBody fails
      try {
        body = await request.json();
      } catch {
        body = null;
      }
    }
    const state = handleCartAction(body);
    json(200, state);
  } catch (error: any) {
    json(500, { error: error?.message || "Internal server error" });
  }
};
