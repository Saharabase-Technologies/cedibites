import type { Metadata } from 'next';
import { StaffAuthProvider } from '@/app/components/providers/StaffAuthProvider';

export const metadata: Metadata = {
  title: 'Staff',
  robots: { index: false, follow: false },
};

export default function StaffAuthLayout({ children }: { children: React.ReactNode }) {
    return <StaffAuthProvider>{children}</StaffAuthProvider>;
}
