import 'server-only';

import { auth } from '@/lib/auth';

export type ApiErrorBody = {
  error: string;
  fieldErrors?: Record<string, string[]>;
};

export function apiError(
  error: string,
  status: number,
  fieldErrors?: Record<string, string[]>,
) {
  return Response.json({ error, fieldErrors } satisfies ApiErrorBody, { status });
}

export async function authorizeApiRequest(
  request: Request,
  allowedRoles: readonly string[],
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return { ok: false as const, response: apiError('Unauthorized.', 401) };
  }
  if (!allowedRoles.includes(session.user.role ?? '')) {
    return { ok: false as const, response: apiError('Forbidden.', 403) };
  }

  return { ok: true as const, session };
}

export async function readJson(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return apiError('Invalid JSON request body.', 400);
  }
}
