/**
 * Google's encoded polyline, decoded.
 *
 * A road route comes back from the Routes API as a single string: each point
 * stored as a difference from the one before, in units of a hundred thousandth
 * of a degree, chopped into five-bit chunks and shifted into printable ASCII. A
 * five kilometre drive is a couple of hundred characters rather than a couple of
 * hundred pairs of floats, which is why it is worth the arithmetic.
 *
 * Google ships a decoder in the `geometry` library, but the Maps script on this
 * site loads `places` and nothing else. Twenty lines here beats another library
 * on every page for one string.
 */
export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
    const points: { lat: number; lng: number }[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    // Reads one signed value: five bits at a time, low chunk first, until a
    // chunk arrives without the continuation bit set.
    const next = (): number | null => {
        let result = 0;
        let shift = 0;
        let chunk: number;

        do {
            if (index >= encoded.length) return null;
            chunk = encoded.charCodeAt(index++) - 63;
            if (!Number.isFinite(chunk) || chunk < 0) return null;
            result |= (chunk & 0x1f) << shift;
            shift += 5;
        } while (chunk >= 0x20);

        // The low bit is the sign, and a negative value was inverted before it
        // was shifted up.
        return result & 1 ? ~(result >> 1) : result >> 1;
    };

    while (index < encoded.length) {
        const dLat = next();
        const dLng = next();

        // A truncated string stops the walk rather than filling the map with
        // points off the coast of nowhere.
        if (dLat === null || dLng === null) break;

        lat += dLat;
        lng += dLng;
        points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    return points;
}
