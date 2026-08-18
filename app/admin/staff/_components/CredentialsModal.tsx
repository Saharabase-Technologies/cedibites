'use client';

import { ShieldCheckIcon } from '@phosphor-icons/react';
import { toast } from '@/lib/utils/toast';

export interface RevealedCredentials {
    name: string;
    identifier: string;
    password: string;
}

/** Shown once, after an auto-generated password. Never retrievable afterwards. */
export function CredentialsModal({ creds, onClose }: { creds: RevealedCredentials; onClose: () => void }) {
    function copy(value: string, label: string) {
        navigator.clipboard?.writeText(value);
        toast.success(`${label} copied`);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
            <div className="bg-neutral-card rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheckIcon size={20} weight="fill" className="text-primary" />
                    <h3 className="text-text-dark text-lg font-bold font-body">Account created</h3>
                </div>
                <p className="text-neutral-gray text-sm font-body mb-4">
                    A welcome email was sent to <span className="font-semibold text-text-dark">{creds.name}</span>. Share these credentials confidentially. This password won&apos;t be shown again.
                </p>
                <div className="flex flex-col gap-2 mb-5">
                    <div className="flex items-center justify-between gap-3 bg-neutral-light border border-[#f0e8d8] rounded-xl px-3 py-2.5">
                        <div className="min-w-0">
                            <p className="text-neutral-gray text-[10px] font-bold uppercase tracking-wider font-body">Login</p>
                            <p className="text-text-dark text-sm font-body font-medium truncate">{creds.identifier}</p>
                        </div>
                        <button type="button" onClick={() => copy(creds.identifier, 'Login')}
                            className="text-primary text-xs font-semibold font-body hover:underline shrink-0 cursor-pointer">Copy</button>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-neutral-light border border-[#f0e8d8] rounded-xl px-3 py-2.5">
                        <div className="min-w-0">
                            <p className="text-neutral-gray text-[10px] font-bold uppercase tracking-wider font-body">Temporary password</p>
                            <p className="text-text-dark text-sm font-body font-bold tracking-wide truncate">{creds.password}</p>
                        </div>
                        <button type="button" onClick={() => copy(creds.password, 'Password')}
                            className="text-primary text-xs font-semibold font-body hover:underline shrink-0 cursor-pointer">Copy</button>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button type="button"
                        onClick={() => copy(`Login: ${creds.identifier}\nPassword: ${creds.password}`, 'Credentials')}
                        className="px-4 py-2 rounded-xl border border-[#f0e8d8] text-text-dark/80 text-sm font-semibold font-body hover:border-primary/40 transition-colors cursor-pointer">Copy both</button>
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold font-body hover:bg-primary-hover transition-colors cursor-pointer">Done</button>
                </div>
            </div>
        </div>
    );
}
