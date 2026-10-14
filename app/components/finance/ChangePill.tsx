import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { signedPct } from '@/lib/finance/format';

/** A change as a pill: up, down or flat (D7). Nothing when there is no change to show. */
export function ChangePill({ value }: { value: number | null }) {
  if (value == null || !isFinite(value)) return null;
  const tone = value > 0.0005 ? TONE.done : value < -0.0005 ? TONE.problem : TONE.neutral;
  const Icon = value > 0.0005 ? CaretUpIcon : value < -0.0005 ? CaretDownIcon : null;
  const words = value > 0.0005 ? 'Up' : value < -0.0005 ? 'Down' : 'Flat';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tone.bg} ${tone.text}`}>
      {Icon && <Icon size={11} weight="fill" aria-hidden />}
      <span className="sr-only">{words} </span>
      {signedPct(value).replace(/^[+-]/, '')}
    </span>
  );
}
