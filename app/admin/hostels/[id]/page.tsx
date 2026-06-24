import { redirect } from 'next/navigation';

export default function HostelIdPage({ params }: { params: { id: string } }) {
  redirect(`/admin/hostels/${params.id}/builder`);
}
