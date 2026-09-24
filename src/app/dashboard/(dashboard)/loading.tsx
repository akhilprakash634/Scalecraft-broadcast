import { DashboardPageSkeleton } from '@/components/ui/PageLoader';

// Next.js automatically renders this file during page transitions/suspense
export default function DashboardLoading() {
  return <DashboardPageSkeleton />;
}
