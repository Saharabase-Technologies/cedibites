import Link from 'next/link';
import { HourglassIcon, ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';

export default function ComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <HourglassIcon size={48} weight="thin" className="text-primary/40 mb-4" />
      <h1 className="text-2xl font-semibold font-brand text-text-dark mb-2">{title}</h1>
      {description && (
        <p className="text-neutral-gray font-body text-sm max-w-sm mb-6">{description}</p>
      )}
      <Link
        href="/inventory/dashboard"
        className="flex items-center gap-2 text-sm font-body text-primary hover:underline"
      >
        <ArrowLeftIcon size={14} />
        Back to dashboard
      </Link>
    </div>
  );
}
