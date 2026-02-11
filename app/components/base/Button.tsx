import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Size, Variant, BaseComponentProps } from '@/types/components';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, BaseComponentProps {
    children: ReactNode;
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
}

const sizeClasses: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
};

const variantClasses: Record<Variant, string> = {
    primary: 'bg-primary hover:bg-primary-hover text-brand-darker',
    secondary: 'bg-transparent dark:text-neutral-light dark:hover:bg-neutral-gray border hover:bg-brand-dark active:bg-brown-light hover:text-text-light text-text-dark',
    success: 'bg-success hover:bg-secondary-hover text-white',
    warning: 'bg-warning hover:bg-primary-hover text-white',
    error: 'bg-error hover:bg-red-600 text-white',
    neutral: 'bg-transparent hover:bg-primary-hover/15 dark:hover:bg-primary-hover/10 text-text-dark dark:text-neutral-light',
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
    const baseClasses = ' cursor-pointer font-semibold rounded-full transition-all duration-200 inline-flex items-center justify-center gap-2';
    const disabledClasses = disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.2 active:translate-y-0';
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
                <span className="animate-spin">⏳</span>
            )}
            {!loading && icon && iconPosition === 'left' && <span>{icon}</span>}
            {children}
            {!loading && icon && iconPosition === 'right' && <span>{icon}</span>}
        </button>
    );
}