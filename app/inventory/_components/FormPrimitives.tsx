'use client';

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

// ─── FormField wrapper ────────────────────────────────────────────────────────

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-text-dark text-sm font-medium font-body"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-red-500 text-xs font-body">{error}</p>
      ) : hint ? (
        <p className="text-neutral-gray text-xs font-body">{hint}</p>
      ) : null}
    </div>
  );
}

// ─── Text input ───────────────────────────────────────────────────────────────

const INPUT_BASE =
  'w-full px-3.5 py-2.5 border border-[#e3e1de] rounded-xl text-sm font-body text-text-dark bg-[#f5f4f2] placeholder:text-neutral-gray/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-shadow min-h-11';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input {...rest} className={`${INPUT_BASE} ${className}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea {...rest} className={`${INPUT_BASE} min-h-20 resize-y ${className}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', children, ...rest } = props;
  return (
    <select {...rest} className={`${INPUT_BASE} appearance-none pr-10 bg-no-repeat cursor-pointer ${className}`}
      style={{
        backgroundImage:
          'url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23737373%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><polyline points=%276 9 12 15 18 9%27/></svg>")',
        backgroundPosition: 'right 12px center',
      }}
    >
      {children}
    </select>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group cursor-pointer"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-neutral-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
      {label && (
        <span className="text-sm font-body text-text-dark">{label}</span>
      )}
    </button>
  );
}

// ─── Submit button ────────────────────────────────────────────────────────────

export function PrimaryButton({
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  const { className = '', disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`w-full bg-primary text-white py-3 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? 'Saving…' : children}
    </button>
  );
}
