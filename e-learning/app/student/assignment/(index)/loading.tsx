import { ListSkeleton, PageHeaderSkeleton } from '@/components/dashboard/skeletons';

// The rows layout, because that is what `parseListView` falls back to.
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton toolbar />
      <ListSkeleton kind="cards" view="rows" count={4} />
    </>
  );
}
