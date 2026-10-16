'use client';

import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { isSalesStaff } from '@/app/staff/_components/isSalesStaff';
import MySalesView from '@/app/staff/my-sales/MySalesView';
import CallCentreMySalesView from '@/app/staff/my-sales/call-centre/MySalesView';

export default function MySalesPage() {
    const { staffUser } = useStaffAuth();
    return isSalesStaff(staffUser) ? <MySalesView /> : <CallCentreMySalesView />;
}
