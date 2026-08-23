import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import type { ReactNode } from 'react';

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink-strong"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}
