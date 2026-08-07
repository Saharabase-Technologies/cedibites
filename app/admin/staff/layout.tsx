import type { Metadata } from 'next';
import { StaffTabNav } from './StaffTabNav';

export const metadata: Metadata = { title: 'Staff' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <StaffTabNav />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
