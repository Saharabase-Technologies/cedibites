'use client';

import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { isSalesStaff } from '@/app/staff/_components/isSalesStaff';
import SalesMyShiftsView from '@/app/staff/my-shifts/SalesMyShiftsView';
import MyShiftsView from '@/app/staff/my-shifts/MyShiftsView';

export default function SalesMyShiftsPage() {
    const { staffUser } = useStaffAuth();
    return isSalesStaff(staffUser) ? <SalesMyShiftsView /> : <MyShiftsView />;
}
