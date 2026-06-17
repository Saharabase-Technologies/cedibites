'use client';

import { useState, forwardRef } from 'react';
import { XIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'search';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: React.ReactNode;
  clearable?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  autoComplete?: string;
  maxLength?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  onEnter?: () => void;
  className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  helperText,
  errorText,
  leftIcon,
  clearable = true,
  disabled = false,
  required = false,
  name,
  id,
  autoComplete,
  maxLength,
  onFocus,
  onBlur,
  onEnter,
  className = '',
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const hasError = !!errorText;
  const showClear = clearable && value && !isPassword;

  // Border only (no outer glow). Gold focus so an active field never reads
  // as a red error. Error > focus > rest.
  const fieldStateClass =
    disabled ? 'border-border' :
      hasError ? 'border-error' :
        isFocused ? 'border-tertiary' :
          'border-border hover:border-fg/25';

  const handleClear = () => {
    onChange('');
    (ref as React.RefObject<HTMLInputElement>)?.current?.focus();
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>

      {label && (
        <label
          htmlFor={id || name}
          className="text-sm font-semibold text-fg px-1"
        >
          {label}
          {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative w-full flex items-center">

        {leftIcon && (
          <span
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors
              ${disabled ? 'text-fg-subtle/40' : hasError ? 'text-error' : isFocused ? 'text-tertiary' : 'text-fg-subtle'}`}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={id || name}
          name={name}
          type={resolvedType}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          maxLength={maxLength}
          onChange={e => onChange(e.target.value)}
          onFocus={() => { setIsFocused(true); onFocus?.(); }}
          onBlur={() => { setIsFocused(false); onBlur?.(); }}
          onKeyDown={e => {
            if (e.key === 'Enter') onEnter?.();
            if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
          }}
          aria-invalid={hasError}
          className={`
            w-full py-2.5 md:py-3 text-[15px] md:text-base
            ${leftIcon ? 'pl-11' : 'pl-4'}
            ${showClear || isPassword ? 'pr-11' : 'pr-4'}
            bg-surface-sunken
            border ${fieldStateClass}
            rounded-2xl
            text-fg font-medium
            placeholder:text-fg-subtle placeholder:font-normal
            transition-colors duration-150 outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />

        {/* Password toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-fg-subtle hover:text-fg hover:bg-fg/8 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword
              ? <EyeSlashIcon size={18} weight="bold" />
              : <EyeIcon size={18} weight="bold" />
            }
          </button>
        )}

        {/* Clear button */}
        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-fg-subtle hover:text-fg hover:bg-fg/8 transition-colors"
            aria-label="Clear input"
          >
            <XIcon size={18} weight="bold" />
          </button>
        )}
      </div>

      {(errorText || helperText) && (
        <p className={`text-xs px-1 ${hasError ? 'text-error' : 'text-fg-subtle'}`}>
          {errorText || helperText}
        </p>
      )}

    </div>
  );
});

Input.displayName = 'Input';

export default Input;
