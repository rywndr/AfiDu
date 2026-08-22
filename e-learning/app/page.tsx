import { redirect } from 'next/navigation';

import { dashboardPathFor, getSession } from '@/lib/session';

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  redirect(dashboardPathFor(session.user.role));
}
