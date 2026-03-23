import { StaffAuthProvider } from '@/app/components/providers/StaffAuthProvider';

export default function StaffAuthLayout({ children }: { children: React.ReactNode }) {
    return <StaffAuthProvider>{children}</StaffAuthProvider>;
}
