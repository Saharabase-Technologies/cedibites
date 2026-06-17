'use client';

import { ShoppingBagIcon, HeartIcon, StarIcon, MagnifyingGlassIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react';
import Button from '../components/base/Button';
import Input from '../components/base/Input';
import SearchField from '../components/base/SearchField';
import Card from '../components/base/Card';
import Badge from '../components/base/Badge';
import Chip from '../components/base/Chip';
import Divider from '../components/base/Divider';
import Reveal from '../components/base/Reveal';
import ThemeToggle from '../components/base/ThemeToggle';
import type { Tone } from '@/types/components';
import { useState } from 'react';

const tones: Tone[] = ['primary', 'secondary', 'tertiary', 'success', 'warning', 'error', 'info', 'neutral'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-fg-subtle">{title}</h2>
            {children}
        </section>
    );
}

function Swatch({ name, varName }: { name: string; varName: string }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="h-12 rounded-xl border border-border" style={{ backgroundColor: `var(${varName})` }} />
            <span className="text-[11px] font-medium text-fg-muted">{name}</span>
        </div>
    );
}

/** All primitives in one block — rendered live and inside the parity panels. */
function Kitchen({ compact = false }: { compact?: boolean }) {
    const [chip, setChip] = useState('jollof');
    const [text, setText] = useState('');
    const [email, setEmail] = useState('not-an-email');
    const [pwd, setPwd] = useState('');
    const [q, setQ] = useState('');
    return (
        <div className="space-y-8">
            {!compact && (
                <Section title="Primitive palette">
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
                            {['50', '100', '200', '300', '400', '500', '600', '700', '800'].map((s) => (
                                <Swatch key={s} name={`red ${s}`} varName={`--cb-red-${s}`} />
                            ))}
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
                            {['50', '100', '200', '300', '400', '500', '600', '700', '800'].map((s) => (
                                <Swatch key={s} name={`green ${s}`} varName={`--cb-green-${s}`} />
                            ))}
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-8 gap-2">
                            {['50', '100', '200', '300', '400', '500', '600', '700'].map((s) => (
                                <Swatch key={s} name={`gold ${s}`} varName={`--cb-gold-${s}`} />
                            ))}
                        </div>
                    </div>
                </Section>
            )}

            <Section title="Semantic surfaces & text">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Swatch name="bg" varName="--cb-bg" />
                    <Swatch name="surface" varName="--cb-surface" />
                    <Swatch name="surface-raised" varName="--cb-surface-raised" />
                    <Swatch name="surface-sunken" varName="--cb-surface-sunken" />
                    <Swatch name="fg" varName="--cb-fg" />
                    <Swatch name="fg-muted" varName="--cb-fg-muted" />
                    <Swatch name="fg-subtle" varName="--cb-fg-subtle" />
                    <Swatch name="border" varName="--cb-border" />
                </div>
                <p className="text-fg">Foreground text — primary readable copy.</p>
                <p className="text-fg-muted">Muted text — secondary copy and helper labels.</p>
                <p className="text-fg-subtle">Subtle text — captions and metadata.</p>
            </Section>

            <Section title="Buttons">
                <div className="flex flex-wrap gap-3">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="tertiary">Tertiary</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="warning">Warning</Button>
                    <Button variant="error">Error</Button>
                    <Button variant="neutral">Neutral</Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm" icon={<ShoppingBagIcon weight="bold" size={16} />}>Add to cart</Button>
                    <Button size="md" loading>Placing order</Button>
                    <Button size="lg" disabled>Disabled</Button>
                </div>
            </Section>

            {!compact && (
                <Section title="Inputs (tight · cute · mobile-friendly)">
                    <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
                        <Input value={text} onChange={setText} label="Your name" placeholder="e.g. Ama" leftIcon={<MagnifyingGlassIcon size={18} weight="bold" />} />
                        <Input type="email" value={email} onChange={setEmail} label="Email" placeholder="you@example.com" leftIcon={<EnvelopeSimpleIcon size={18} weight="bold" />} errorText="Enter a valid email address" />
                        <Input type="password" value={pwd} onChange={setPwd} label="Password" placeholder="••••••••" helperText="At least 8 characters" />
                        <Input value="" onChange={() => {}} label="Disabled" placeholder="Unavailable" disabled />
                    </div>
                    <div className="grid gap-3 max-w-2xl pt-2">
                        <SearchField value={q} onChange={setQ} size="sm" placeholder="Search (sm)…" />
                        <SearchField value={q} onChange={setQ} size="md" placeholder="Search dishes, drinks… (md)" />
                        <SearchField value={q} onChange={setQ} size="lg" placeholder="Search for Jollof, Banku, Waakye… (lg)" />
                    </div>
                </Section>
            )}

            <Section title="Badges">
                <div className="flex flex-wrap gap-2">
                    {tones.map((t) => <Badge key={t} tone={t} variant="soft">{t}</Badge>)}
                </div>
                <div className="flex flex-wrap gap-2">
                    {tones.map((t) => <Badge key={t} tone={t} variant="solid">{t}</Badge>)}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge tone="success" dot>Open Now</Badge>
                    <Badge tone="error" dot variant="soft">Closed</Badge>
                    <Badge tone="tertiary" variant="outline">Bestseller</Badge>
                </div>
            </Section>

            <Section title="Chips (category filters)">
                <div className="flex flex-wrap gap-3">
                    {['jollof', 'fried-rice', 'noodles', 'wraps', 'drinks'].map((c) => (
                        <Chip key={c} active={chip === c} onClick={() => setChip(c)}>
                            {c.replace('-', ' ')}
                        </Chip>
                    ))}
                </div>
            </Section>

            <Section title="Cards">
                <div className="grid sm:grid-cols-3 gap-4">
                    <Card elevation="flat">
                        <p className="font-bold mb-1">Flat</p>
                        <p className="text-sm text-fg-muted">Default surface on the page background.</p>
                    </Card>
                    <Card elevation="raised">
                        <p className="font-bold mb-1">Raised</p>
                        <p className="text-sm text-fg-muted">Elevated surface with a soft shadow.</p>
                    </Card>
                    <Card elevation="sunken" interactive>
                        <p className="font-bold mb-1 flex items-center gap-2">Interactive <HeartIcon weight="fill" className="text-primary" size={16} /></p>
                        <p className="text-sm text-fg-muted">Hover me — lifts on pointer.</p>
                    </Card>
                </div>
            </Section>

            <Section title="Dividers">
                <Divider />
                <Divider label="or" />
                <div className="flex items-center gap-4 h-8">
                    <span className="text-sm text-fg-muted flex items-center gap-1"><StarIcon weight="fill" className="text-tertiary" size={14} /> 4.8</span>
                    <Divider orientation="vertical" />
                    <span className="text-sm text-fg-muted">25 min</span>
                    <Divider orientation="vertical" />
                    <span className="text-sm text-fg-muted">₵5 delivery</span>
                </div>
            </Section>

            {!compact && (
                <>
                    <Section title="Reveal on scroll (transform-free)">
                        <div className="grid sm:grid-cols-2 gap-4">
                            {(['fade-in', 'blur-in'] as const).map((a, i) => (
                                <Reveal key={a} animation={a} delay={i * 80}>
                                    <Card elevation="raised">
                                        <p className="font-bold">{a}</p>
                                        <p className="text-sm text-fg-muted">Opacity/blur only — never moves layout.</p>
                                    </Card>
                                </Reveal>
                            ))}
                        </div>
                    </Section>

                    <Section title="Interactions (no translate — glow / inner-shadow / color)">
                        <div className="grid sm:grid-cols-3 gap-4">
                            <Card elevation="raised" className="cb-inner-glow">
                                <p className="font-bold mb-1">Inner glow</p>
                                <p className="text-sm text-fg-muted">Hover me — soft inset ring, no movement.</p>
                            </Card>
                            <Card elevation="raised" className="animate-glow-breathe" style={{ '--cb-glow': 'var(--cb-gold-400)' } as React.CSSProperties}>
                                <p className="font-bold mb-1">Glow breathe</p>
                                <p className="text-sm text-fg-muted">Ambient pulsing glow for attention.</p>
                            </Card>
                            <Card elevation="raised" interactive>
                                <p className="font-bold mb-1">Press</p>
                                <p className="text-sm text-fg-muted">Click &amp; hold — tactile inner-shadow dip.</p>
                            </Card>
                        </div>
                    </Section>
                </>
            )}
        </div>
    );
}

/** A self-contained themed panel (forces light or dark regardless of page theme). */
function ParityPanel({ mode }: { mode: 'light' | 'dark' }) {
    return (
        <div className={`${mode} rounded-3xl border border-border overflow-hidden`}>
            <div className="bg-bg text-fg p-5 space-y-6">
                <div className="flex items-center justify-between">
                    <span className="font-family-brand text-xl text-primary">CediBites</span>
                    <Badge tone={mode === 'dark' ? 'tertiary' : 'primary'} variant="soft">{mode}</Badge>
                </div>
                <Kitchen compact />
            </div>
        </div>
    );
}

export default function ShowcasePage() {
    return (
        <div className="min-h-dvh bg-bg text-fg">
            <header className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-border">
                <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="font-family-brand text-2xl text-primary leading-none">Design System</h1>
                        <p className="text-xs text-fg-subtle mt-1">CediBites · Foundation showcase</p>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-5 py-8 space-y-12">
                <p className="text-fg-muted max-w-2xl">
                    Live preview — toggle the theme (top-right) to see every token, surface and
                    primitive flip. The two panels at the bottom show light and dark side-by-side
                    for contrast parity, independent of the active theme.
                </p>

                <Kitchen />

                <Section title="Light / Dark parity (side by side)">
                    <div className="grid lg:grid-cols-2 gap-5">
                        <ParityPanel mode="light" />
                        <ParityPanel mode="dark" />
                    </div>
                </Section>
            </main>
        </div>
    );
}
