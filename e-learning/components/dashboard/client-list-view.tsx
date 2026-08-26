'use client';

import Link from 'next/link';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';

import { listViewClass, type ListView } from '@/lib/list-view';
import { cn } from '@/lib/utils';

type ListViewState = {
  view: ListView;
  setView: (view: ListView) => void;
};

const ListViewContext = createContext<ListViewState | null>(null);

type ListViewProviderProps = {
  initialView: ListView;
  children: ReactNode;
};

export function ListViewProvider({
  initialView,
  children,
}: ListViewProviderProps) {
  const [serverView, setServerView] = useState(initialView);
  const [view, setViewState] = useState(initialView);

  if (initialView !== serverView) {
    setServerView(initialView);
    setViewState(initialView);
  }

  const setView = useCallback((nextView: ListView) => {
    setViewState(nextView);

    const url = new URL(window.location.href);
    if (nextView === 'grid') url.searchParams.set('view', 'grid');
    else url.searchParams.delete('view');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const value = useMemo(() => ({ view, setView }), [view, setView]);

  return (
    <ListViewContext.Provider value={value}>{children}</ListViewContext.Provider>
  );
}

export function useListView(): ListViewState {
  const state = useContext(ListViewContext);
  if (!state) {
    throw new Error('List view controls must be inside ListViewProvider');
  }
  return state;
}

export function useOptionalListView(): ListViewState | null {
  return useContext(ListViewContext);
}

export function ClientList({
  className,
  ...props
}: ComponentProps<'ul'>) {
  const { view } = useListView();

  return <ul className={cn(listViewClass(view), className)} {...props} />;
}

type ListViewLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
};

export function ListViewLink({ href, ...props }: ListViewLinkProps) {
  const { view } = useListView();
  const url = new URL(href, 'http://internal');

  if (view === 'grid') url.searchParams.set('view', 'grid');
  else url.searchParams.delete('view');

  return <Link href={`${url.pathname}${url.search}${url.hash}`} {...props} />;
}
