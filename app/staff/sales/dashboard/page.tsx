'use client';

import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { isSalesStaff } from '@/app/staff/_components/isSalesStaff';
import SalesDashboardView from '@/app/staff/dashboard/SalesDashboardView';
import CallCentreDashboardView from '@/app/staff/dashboard/CallCentreDashboardView';

export default function SalesDashboardPage() {
    const { staffUser } = useStaffAuth();
    return isSalesStaff(staffUser) ? <SalesDashboardView /> : <CallCentreDashboardView />;
}
