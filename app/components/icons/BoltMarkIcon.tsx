import type { SVGProps } from 'react';

/**
 * Bolt's mark: the ring with the dot beneath it, taken from bolt.eu's own
 * site icon. Drawn in the current text colour so it sits beside Phosphor's
 * icons and follows a button's selected state.
 *
 * Takes Phosphor's `size` and ignores its `weight`, so it can stand in for a
 * Phosphor icon wherever one is passed around as a component.
 */
export function BoltMarkIcon({
    size,
    className,
    ...props
}: SVGProps<SVGSVGElement> & { size?: number | string; weight?: string }) {
    // Phosphor's `weight` means nothing to a filled mark, and is not an SVG attribute.
    const rest: SVGProps<SVGSVGElement> & { weight?: string } = { ...props };
    delete rest.weight;

    return (
        <svg
            viewBox="19 19 232 232"
            width={size ?? (className ? undefined : '1em')}
            height={size ?? (className ? undefined : '1em')}
            fill="currentColor"
            aria-hidden="true"
            className={className}
            {...rest}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M55.0322 99.6531C55.0322 55.2846 90.9545 19.3707 135.172 19.3707C179.39 19.3707 215.24 55.3569 215.312 99.6531C215.312 144.021 179.39 179.935 135.172 179.935C90.8824 179.935 55.0322 143.949 55.0322 99.6531ZM109.204 99.6531C109.204 114.033 120.818 125.667 135.172 125.667C149.527 125.667 161.14 114.033 161.14 99.6531C161.14 85.2731 149.527 73.639 135.172 73.639C120.818 73.639 109.204 85.2731 109.204 99.6531ZM161.14 224.665C161.14 239.032 149.514 250.679 135.173 250.679C120.831 250.679 109.205 239.032 109.205 224.665C109.205 210.298 120.831 198.651 135.173 198.651C149.514 198.651 161.14 210.298 161.14 224.665Z"
            />
        </svg>
    );
}
