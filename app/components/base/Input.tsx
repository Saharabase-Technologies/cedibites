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

  const borderClass =
    disabled ? 'border-neutral-gray/30' :
      hasError ? 'border-error' :
        isFocused ? 'border-primary' :
          'border-neutral-gray/50';

  const handleClear = () => {
    onChange('');
    (ref as React.RefObject<HTMLInputElement>)?.current?.focus();
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>

      {label && (
        <label
          htmlFor={id || name}
          className={`text-sm font-medium ${disabled ? 'text-text-dark dark:text-text-light' : 'text-text-dark dark:text-text-light '}`}
        >
          {label}
          {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative w-full flex items-center">

        {leftIcon && (
          <span
            className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors
              ${disabled ? 'text-neutral-gray/40' : hasError ? 'text-error' : isFocused ? 'text-primary' : 'text-neutral-gray'}`}
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
            w-full py-3 md:py-4 text-base
            ${leftIcon ? 'pl-14' : 'pl-5'}
            ${showClear || isPassword ? 'pr-14' : 'pr-5'}
            bg-neutral-light dark:bg-brand-dark
            border-2 ${borderClass}
            rounded-full
           text-text-dark dark:text-text-light
            placeholder:text-neutral-gray
            transition-all duration-150 outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />

        {/* Password toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-neutral-gray hover:text-brown hover:bg-neutral-gray/10 transition-colors cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword
              ? <EyeSlashIcon size={20} weight="bold" />
              : <EyeIcon size={20} weight="bold" />
            }
          </button>
        )}

        {/* Clear button */}
        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-neutral-gray hover:text-brown hover:bg-neutral-gray/10 transition-colors cursor-pointer"
            aria-label="Clear input"
          >
            <XIcon size={20} weight="bold" />
          </button>
        )}
      </div>

      {(errorText || helperText) && (
        <p className={`text-sm px-1 ${hasError ? 'text-error' : 'text-neutral-gray'}`}>
          {errorText || helperText}
        </p>
      )}

    </div>
  );
});

Input.displayName = 'Input';

export default Input;
