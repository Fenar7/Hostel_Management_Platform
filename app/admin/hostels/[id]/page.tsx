import HostelDashboardView from "@/components/hostel-management/HostelDashboardView";

export default async function HostelIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <HostelDashboardView 
      hostelId={id} 
      baseRoute={`/admin/hostels/${id}`} 
      userRole="MAIN_ADMIN" 
    />
  );
}
