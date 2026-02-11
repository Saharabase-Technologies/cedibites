import { SpinnerGapIcon } from '@phosphor-icons/react';

interface LoaderProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'primary' | 'secondary' | 'white' | 'dark';
    text?: string;
    fullScreen?: boolean;
}

const sizeClasses = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
};

const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    white: 'text-white',
    dark: 'text-text-dark dark:text-text-light',
};

export default function Loader({
    size = 'md',
    variant = 'primary',
    text,
    fullScreen = false
}: LoaderProps) {
    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3">
            <SpinnerGapIcon
                size={sizeClasses[size]}
                weight="bold"
                className={`${colorClasses[variant]} animate-spin`}
            />
            {text && (
                <p className={`text-sm font-medium ${colorClasses[variant]}`}>
                    {text}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-white dark:bg-brand-dark rounded-2xl p-8 shadow-2xl">
                    {spinner}
                </div>
            </div>
        );
    }

    return spinner;
}