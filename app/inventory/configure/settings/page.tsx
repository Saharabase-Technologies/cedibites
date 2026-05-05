import type { Metadata } from 'next';
import { ConfigureShell } from '../_components/ConfigureShell';
import { ConfigureSettingsPage } from './_components/ConfigureSettingsPage';

export const metadata: Metadata = { title: 'Settings — Configure' };

export default function Page() {
  return (
    <ConfigureShell>
      <ConfigureSettingsPage />
    </ConfigureShell>
  );
}
