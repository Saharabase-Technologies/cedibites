'use client';

import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { isSalesStaff } from '@/app/staff/_components/isSalesStaff';
import SalesOrdersView from './SalesOrdersView';
import CallCentreOrdersView from './CallCentreOrdersView';

export default function SalesOrdersPage() {
    const { staffUser } = useStaffAuth();
    return isSalesStaff(staffUser) ? <SalesOrdersView /> : <CallCentreOrdersView />;
}
