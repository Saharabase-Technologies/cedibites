// Size variants for components
export type Size = 'sm' | 'md' | 'lg' | 'xl';

// Color variants
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';

// Common props that many components share
export interface BaseComponentProps {
    className?: string;
    disabled?: boolean;
    loading?: boolean;
}

// Button types
export type ButtonType = 'button' | 'submit' | 'reset';

// Input types
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';

// Icon position
export type IconPosition = 'left' | 'right';