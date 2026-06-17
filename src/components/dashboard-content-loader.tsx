import { PageLoader } from "@/components/ui/page-loader";

export function DashboardContentLoader() {
  return (
    <div className="dashboard-app min-h-dvh bg-[#0c0c0c]">
      <PageLoader variant="viewport" size="lg" />
    </div>
  );
}
