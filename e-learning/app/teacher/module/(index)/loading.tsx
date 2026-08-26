import { ListSkeleton, PageHeaderSkeleton } from '@/components/dashboard/skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <ListSkeleton kind="tiles" count={6} />
    </>
  );
}
