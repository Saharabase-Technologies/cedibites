import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Size, Variant, ButtonType, BaseComponentProps } from '@/types/components';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>, BaseComponentProps {
    children: ReactNode;
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    type?: ButtonType;
}

const sizeClasses: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
};

const variantClasses: Record<Variant, string> = {
    primary: 'bg-primary hover:bg-primary-hover text-white',
    secondary: 'bg-secondary hover:bg-secondary-hover text-white',
    tertiary: 'bg-tertiary hover:bg-tertiary-hover text-brown',
    success: 'bg-success hover:bg-secondary-hover text-white',
    warning: 'bg-warning hover:bg-tertiary-hover text-brown',
    error: 'bg-error hover:bg-red-600 text-white',
    neutral: 'bg-transparent border border-border hover:bg-fg/5 text-fg',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    icon,
    iconPosition = 'left',
    disabled = false,
    loading = false,
    className = '',
    type = 'button',
    ...props
}: ButtonProps) {
    const baseClasses = 'cb-press cursor-pointer font-semibold rounded-full inline-flex items-center justify-center gap-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg';
    const disabledClasses = disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:brightness-[1.03]';
    const widthClasses = fullWidth ? 'w-full' : '';

    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabledClasses}
        ${widthClasses}
        ${className}
      `}
            {...props}
        >
            {loading && (
                <svg className="animate-spin h-[1em] w-[1em]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                </svg>
            )}
            {!loading && icon && iconPosition === 'left' && <span>{icon}</span>}
            {children}
            {!loading && icon && iconPosition === 'right' && <span>{icon}</span>}
        </button>
    );
}