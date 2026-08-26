import { ListSkeleton, PageHeaderSkeleton, SectionSkeleton } from '@/components/dashboard/skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton tone="accent" />
      <SectionSkeleton aside>
        <ListSkeleton kind="cards" view="rows" count={4} />
      </SectionSkeleton>
    </>
  );
}
