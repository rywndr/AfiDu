/**
 * The rows/grid layout switch shared by the teacher module and assignment
 * lists. The layout lives in the `view` search param so it survives a reload.
 */
export type ListView = 'rows' | 'grid';

export function parseListView(value: unknown): ListView {
  return value === 'grid' ? 'grid' : 'rows';
}

/** The classes the list element needs for a layout. */
export function listViewClass(view: ListView): string {
  return view === 'grid'
    ? 'grid items-stretch gap-3 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-3'
    : 'flex flex-col gap-3 sm:gap-4';
}
