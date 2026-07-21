import type { Metadata } from 'next';
import { ConfigureShell } from './_components/ConfigureShell';
import { ConfigureHub } from './_components/ConfigureHub';

export const metadata: Metadata = { title: 'Configure' };

export default function ConfigurePage() {
  return (
    <ConfigureShell>
      <ConfigureHub />
    </ConfigureShell>
  );
}
