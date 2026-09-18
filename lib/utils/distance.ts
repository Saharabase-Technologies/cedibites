/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Calculate distance and format for display
 */
export function formatDistance(distanceInKm: number): string {
    if (distanceInKm < 1) {
        return `${Math.round(distanceInKm * 1000)}m`;
    }
    return `${distanceInKm.toFixed(1)}km`;
}

/**
 * Average riding speed through city traffic, in km/h.
 *
 * Both times a customer is shown are built on this one figure: the ride to the
 * shop, and the whole delivery once the kitchen has cooked. Two speeds would
 * let those two numbers drift apart.
 */
const RIDING_SPEED_KMH = 30;

/**
 * Minutes on the road, rounded up.
 *
 * The epsilon is not fussiness. 15.5 km at 30 km/h is 31.000000000000004
 * minutes in binary floating point, and a bare ceiling turns an exact half hour
 * into 32 minutes. That would have quietly added a minute to the delivery
 * estimate at a handful of distances.
 */
export function estimateTravelMinutes(distanceInKm: number): number {
    return Math.ceil((distanceInKm / RIDING_SPEED_KMH) * 60 - 1e-9);
}

/**
 * The ride itself, in words.
 *
 * Takes minutes rather than a distance, because the minutes now come from two
 * places. Google's Routes API returns a real drive down real roads when the map
 * can reach it, and `estimateTravelMinutes` fills in when it cannot. Both end up
 * worded the same way, so nothing on screen announces which one you are looking
 * at.
 *
 * "9 min ride" for a shop down the road, "14 hr 18 min ride" for one nobody is
 * riding to. The long answer is not a bug: a customer four hundred kilometres
 * from a kitchen should see that in plain terms rather than a tidy number.
 */
export function formatRideMinutes(minutes: number): string {
    // Never "0 min ride". Standing outside the shop still counts as a minute.
    const total = Math.max(1, Math.round(minutes));
    if (total < 60) return `${total} min ride`;

    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest ? `${hours} hr ${rest} min ride` : `${hours} hr ride`;
}

/** Base preparation time, in minutes, before a kitchen can hand anything over. */
const PREP_MINUTES = 15;

/**
 * The window a customer is quoted, built from however long the journey takes.
 *
 * Kept apart from the distance so a real route can drive it. When the map has
 * asked Google how long the roads take right now, the delivery window on that
 * same map is built from that number rather than from a second guess sitting
 * beside it.
 */
export function deliveryWindowFromMinutes(travelMinutes: number): string {
    const totalTime = PREP_MINUTES + Math.max(0, Math.round(travelMinutes));

    return `${totalTime}-${totalTime + 10} mins`;
}

/**
 * Calculate estimated delivery time based on distance
 * The ride, plus the time the kitchen needs before it can hand anything over.
 */
export function estimateDeliveryTime(distanceInKm: number): string {
    return deliveryWindowFromMinutes(estimateTravelMinutes(distanceInKm));
}