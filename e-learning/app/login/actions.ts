'use server';

import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { dashboardPathFor, getSession } from '@/lib/session';

export type SignInState = { error?: string };

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  let role: string | null | undefined;

  try {
    const result = await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
    role = (result.user as { role?: string }).role;
  } catch (error) {
    if (error instanceof APIError) {
      // don't leak whether the address exists
      return { error: 'Incorrect email or password.' };
    }
    console.error('sign-in failed', error);
    return { error: 'Something went wrong. Please try again.' };
  }

  // redirect() throws, so it has to happen outside the try block
  redirect(dashboardPathFor(role));
}

export async function signOutAction() {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (error) {
    console.error('sign-out failed', error);
  }
  redirect('/login');
}

/** Send an already-signed-in visitor to their dashboard. */
export async function redirectIfSignedIn() {
  const session = await getSession();
  if (session) {
    redirect(dashboardPathFor(session.user.role));
  }
}
