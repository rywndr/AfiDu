import { AppLayout } from "@/components/layout/app-layout"

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  return (
    <AppLayout title="Student Details">
      <div>
        <p>Student ID: {params.id}</p>
      </div>
    </AppLayout>
  )
}
