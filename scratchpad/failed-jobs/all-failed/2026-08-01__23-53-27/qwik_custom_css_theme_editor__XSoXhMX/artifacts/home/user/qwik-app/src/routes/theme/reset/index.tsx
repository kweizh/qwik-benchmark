import type { RequestHandler } from '@builder.io/qwik-city';

export const onPost: RequestHandler = async ({ cookie, redirect }) => {
  cookie.delete('user_theme', { path: '/' });
  throw redirect(302, '/theme');
};
