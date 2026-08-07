import type { FeedbackSeverity, FeedbackStatus } from '@/types/feedback';

export const SEVERITY_CONFIG: Record<
  FeedbackSeverity,
  { label: string; chip: string; dot: string }
> = {
  blocking: { label: 'Blocking', chip: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  annoying: { label: 'Annoying', chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  cosmetic: { label: 'Cosmetic', chip: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  suggestion: { label: 'Idea', chip: 'bg-[#eef3e2] text-[#4a5d28] border-[#d3e3b3]', dot: 'bg-secondary' },
};

export const STATUS_CONFIG: Record<FeedbackStatus, { label: string; chip: string }> = {
  new: { label: 'New', chip: 'bg-[#fff0d6] text-[#8a5a12] border-[#f3d9a8]' },
  triaged: { label: 'Triaged', chip: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In progress', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  fixed: { label: 'Fixed', chip: 'bg-[#eef3e2] text-[#4a5d28] border-[#d3e3b3]' },
  wont_fix: { label: "Won't fix", chip: 'bg-neutral-100 text-neutral-500 border-neutral-200' },
};

/** The lifecycle order for the status control. */
export const STATUS_FLOW: FeedbackStatus[] = ['new', 'triaged', 'in_progress', 'fixed', 'wont_fix'];

export const SEVERITY_FILTERS: FeedbackSeverity[] = ['blocking', 'annoying', 'cosmetic', 'suggestion'];
