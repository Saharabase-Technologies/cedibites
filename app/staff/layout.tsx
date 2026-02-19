import type { ReactNode } from 'react';
import { StaffAuthProvider } from './providers/StaffAuthProvider';

export default function StaffLayout({ children }: { children: ReactNode }) {
    return (
        <StaffAuthProvider>
            <main>{children}</main>
        </StaffAuthProvider>
    );
}
