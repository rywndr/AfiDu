import {
  ListSkeleton,
  PageHeaderSkeleton,
  SectionSkeleton,
} from '@/components/dashboard/skeletons';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton backLink toolbar />
      <SectionSkeleton description={false}>
        <ListSkeleton kind="cards" view="rows" count={4} />
      </SectionSkeleton>
    </>
  );
}
