import { ListSkeleton, PageHeaderSkeleton, SectionSkeleton } from '@/components/dashboard/skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <SectionSkeleton>
        <ListSkeleton kind="panel" count={4} />
      </SectionSkeleton>
      <SectionSkeleton aside>
        <ListSkeleton kind="panel" count={5} />
      </SectionSkeleton>
    </>
  );
}
