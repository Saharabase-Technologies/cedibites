import { formatDistance } from "@/lib/utils/distance";
import { MapPinIcon } from "@phosphor-icons/react";
import Loader from "../base/Loader";

interface LocationBadgeProps {
    branch: any;
    distance: number | null | undefined;
    onClick: () => void;
    fullWidth?: boolean;
    isLoading?: boolean;
}


export default function LocationBadge({ branch, distance, onClick, fullWidth, isLoading = false }: LocationBadgeProps) {
    if (isLoading) {
        return (
            <button
                disabled
                className={`flex items-center gap-2 px-4 py-2.5 bg-primary/50 rounded-full cursor-wait ${fullWidth ? 'w-full justify-center' : ''
                    }`}
            >
                <Loader size="sm" variant="white" />
                <span className="text-xs font-semibold text-white">
                    Finding location...
                </span>
            </button>
        );
    }
    if (!branch) {
        return (
            <button
                onClick={onClick}
                className={`flex items-center gap-2 px-4 py-2 bg-primary-light hover:bg-primary-hover border-2 border-dashed border-neutral-gray rounded-full transition-all group ${fullWidth ? 'w-full justify-center' : ''
                    }`}
            >
                <MapPinIcon size={18} weight="bold" className="text-text-dark" />
                <span className="text-sm font-semibold text-text-gray">
                    Select Branch
                </span>
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            className={`flex cursor-pointer items-center gap-2 px-4 py-2.5 bg-primary hover:from-primary-hover hover:to-primary text-text-text-dark rounded-full transition-all group shadow-lg hover:shadow-xl '
                }`}
        >
            <MapPinIcon size={18} weight="fill" className="group-hover:scale-110 transition-transform" />
            <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold  tracking-wide">
                    {branch.name.replace(' Branch', ' Branch')}
                </span>
                {distance && (
                    <>
                        <span className="text-text-dark">•</span>
                        <span className="text-xs font-semibold text-text-dark">
                            {formatDistance(distance)}
                        </span>
                    </>
                )}
            </div>
        </button>
    );
}