import { ListSkeleton, PageHeaderSkeleton } from '@/components/dashboard/skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton toolbar />
      <ListSkeleton kind="cards" view="rows" count={4} />
    </>
  );
}
