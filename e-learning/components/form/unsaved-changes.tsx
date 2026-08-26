'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Leave this page?';

type UnsavedChangesContextValue = {
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
};

const defaultContextValue: UnsavedChangesContextValue = {
  isDirty: false,
  setIsDirty: () => {},
};

const UnsavedChangesContext = createContext(defaultContextValue);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    function handleNavigation(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest('a');
      if (!(link instanceof HTMLAnchorElement)) return;
      if (
        link.hasAttribute('download') ||
        (link.target !== '' && link.target !== '_self')
      ) {
        return;
      }

      const url = new URL(link.href);
      if (
        url.origin !== window.location.origin ||
        url.href === window.location.href
      ) {
        return;
      }

      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleNavigation, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleNavigation, true);
    };
  }, [isDirty]);

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setIsDirty }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}
