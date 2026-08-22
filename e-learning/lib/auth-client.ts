import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  // same-origin in every environment; set NEXT_PUBLIC_BETTER_AUTH_URL only when
  // the auth server lives on a different host
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});

export const { signIn, signOut, useSession } = authClient;
