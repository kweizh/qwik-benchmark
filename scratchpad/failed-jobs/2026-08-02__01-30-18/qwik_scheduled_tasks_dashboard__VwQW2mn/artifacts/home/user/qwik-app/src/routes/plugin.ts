import { type RequestHandler } from '@builder.io/qwik-city';
import { startBackgroundRunner } from '../runner/runner';

export const onRequest: RequestHandler = async (event) => {
  // Start the background runner on any server-side request (if not already running)
  startBackgroundRunner();
  await event.next();
};
