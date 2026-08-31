'use client';

import { ArrowDownIcon, ArrowUpIcon, ImageIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import { TextInput, Textarea } from '@/app/inventory/_components';

/**
 * One slide of a release walkthrough, while it is being written.
 *
 * `key` is a local identity for React and for reordering only. The server
 * assigns each slide its position from the order these are sent in, so nothing
 * here carries an index that could drift out of step with the array.
 */
export interface Slide {
    key: number;
    title: string;
    body: string;
    imagePath: string | null;
    imageUrl: string | null;
}

export function emptySlide(existing: Slide[]): Slide {
    return {
        key: Math.max(0, ...existing.map((slide) => slide.key)) + 1,
        title: '',
        body: '',
        imagePath: null,
        imageUrl: null,
    };
}

/**
 * Writing a walkthrough.
 *
 * One change per slide, because that is how it will be read — somebody paging
 * through on a till between customers, not sitting down with a release note.
 * Slides reorder, since the order changes occurred to whoever wrote them is
 * rarely the order they are best learned in.
 */
export function SlideEditor({
    slides,
    onChange,
    uploading,
    onUpload,
}: {
    slides: Slide[];
    onChange: (next: Slide[]) => void;
    uploading: boolean;
    onUpload: (file: File) => Promise<{ path: string; url: string } | null>;
}) {
    const patch = (key: number, changes: Partial<Slide>) =>
        onChange(slides.map((slide) => (slide.key === key ? { ...slide, ...changes } : slide)));

    const move = (index: number, by: number) => {
        const target = index + by;
        if (target < 0 || target >= slides.length) return;
        const next = [...slides];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    return (
        <div className="flex flex-col gap-3">
            {slides.map((slide, index) => (
                <div key={slide.key} className="rounded-xl border border-[#e3ddd0] bg-neutral-light/60 p-3.5">
                    <div className="flex items-center gap-2 mb-2.5">
                        <span className="w-6 h-6 rounded-lg bg-neutral-card border border-[#e3ddd0] flex items-center justify-center text-[11px] font-bold font-body text-text-dark tabular-nums">
                            {index + 1}
                        </span>
                        <span className="text-[11px] font-bold font-body uppercase tracking-wider text-neutral-gray flex-1">
                            Slide
                        </span>

                        <button
                            type="button"
                            onClick={() => move(index, -1)}
                            disabled={index === 0}
                            aria-label="Move slide up"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-gray hover:text-text-dark hover:bg-neutral-card disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        >
                            <ArrowUpIcon size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => move(index, 1)}
                            disabled={index === slides.length - 1}
                            aria-label="Move slide down"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-gray hover:text-text-dark hover:bg-neutral-card disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        >
                            <ArrowDownIcon size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(slides.filter((entry) => entry.key !== slide.key))}
                            disabled={slides.length === 1}
                            aria-label="Remove slide"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-gray hover:text-error hover:bg-error/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        >
                            <XIcon size={13} />
                        </button>
                    </div>

                    <TextInput
                        value={slide.title}
                        onChange={(event) => patch(slide.key, { title: event.target.value })}
                        placeholder="Heading — e.g. Accepting is claiming"
                    />

                    <div className="mt-2">
                        <Textarea
                            value={slide.body}
                            onChange={(event) => patch(slide.key, { body: event.target.value })}
                            rows={3}
                            placeholder="What changed, and what they should do about it."
                        />
                    </div>

                    <div className="mt-2">
                        {slide.imageUrl ? (
                            <div className="relative inline-block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={slide.imageUrl}
                                    alt=""
                                    className="max-h-28 rounded-lg border border-[#e3ddd0]"
                                />
                                <button
                                    type="button"
                                    onClick={() => patch(slide.key, { imagePath: null, imageUrl: null })}
                                    aria-label="Remove image"
                                    className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-text-dark text-neutral-card cursor-pointer"
                                >
                                    <XIcon size={10} weight="bold" />
                                </button>
                            </div>
                        ) : (
                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#e3ddd0] bg-neutral-card text-xs font-body text-neutral-gray cursor-pointer hover:border-neutral-gray/60 transition-colors">
                                <ImageIcon size={14} />
                                {uploading ? 'Uploading…' : 'Screenshot'}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    disabled={uploading}
                                    onChange={async (event) => {
                                        const file = event.target.files?.[0];
                                        // Cleared before the await so re-picking
                                        // the same file fires change again.
                                        event.target.value = '';
                                        if (!file) return;
                                        const uploaded = await onUpload(file);
                                        if (uploaded) {
                                            patch(slide.key, { imagePath: uploaded.path, imageUrl: uploaded.url });
                                        }
                                    }}
                                />
                            </label>
                        )}
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={() => onChange([...slides, emptySlide(slides)])}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#e3ddd0] text-sm font-body font-medium text-neutral-gray hover:border-neutral-gray/60 hover:text-text-dark transition-colors cursor-pointer"
            >
                <PlusIcon size={14} weight="bold" />
                Add a slide
            </button>
        </div>
    );
}
