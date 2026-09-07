/**
 * How to turn location back on, on the device the customer is actually holding.
 *
 * "Location permission denied. Please enable it in your browser settings." is
 * true and useless. A customer on an iPhone whose Chrome Location switch was
 * set to Never is not going to find that switch by looking at Chrome, because
 * it is not in Chrome. It is three screens into iOS Settings, and no dialog
 * ever appeared to hint at it: the refusal comes back instantly, so from the
 * page's side it looks as though nothing happened at all.
 *
 * So the app names the screens. Two switches can each block us on their own —
 * the operating system's, which decides whether the browser may ask, and the
 * browser's, which decides whether this site may. On iOS the first one is the
 * usual culprit and it always comes first here.
 *
 * Everything below is read off the user agent, which lies often enough that
 * these are written as "look here" rather than as a promise about what a menu
 * is called this month.
 */

export interface PermissionRecovery {
    /** Names the device, so a reader can tell at a glance if it is theirs. */
    device: string;
    steps: string[];
    /** Closing line. Reloading is what actually re-arms the ask. */
    after: string;
}

interface Agent {
    ios: boolean;
    android: boolean;
    mac: boolean;
    /** The engine's own browser, not the badge on the icon. */
    browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'samsung' | 'other';
}

function readAgent(ua: string): Agent {
    const s = ua.toLowerCase();

    const ios = /iphone|ipad|ipod/.test(s)
        // iPadOS 13+ reports itself as a Mac. A Mac with a touchscreen is an iPad.
        || (/macintosh/.test(s) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);

    const android = /android/.test(s);
    const mac = !ios && /macintosh|mac os x/.test(s);

    let browser: Agent['browser'] = 'other';
    if (/edg[ea]?\//.test(s) || /edgios/.test(s)) browser = 'edge';
    else if (/samsungbrowser/.test(s)) browser = 'samsung';
    else if (/firefox|fxios/.test(s)) browser = 'firefox';
    else if (/crios|chrome|chromium/.test(s)) browser = 'chrome';
    else if (/safari/.test(s)) browser = 'safari';

    return { ios, android, mac, browser };
}

/** What the icon on the home screen says, for the iOS Settings list. */
function iosAppName(browser: Agent['browser']): string {
    switch (browser) {
        case 'chrome': return 'Chrome';
        case 'edge': return 'Edge';
        case 'firefox': return 'Firefox';
        default: return 'Safari';
    }
}

export function locationRecovery(userAgent?: string): PermissionRecovery {
    const ua = userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent);
    const { ios, android, mac, browser } = readAgent(ua);

    if (ios) {
        const app = iosAppName(browser);

        // The order matters. iOS refuses on the app's behalf before the browser
        // is ever consulted, and that refusal is silent.
        return {
            device: `${app} on iPhone or iPad`,
            steps: [
                `Open Settings, then Privacy & Security, then Location Services.`,
                `Find ${app} in the list and set it to While Using the App.`,
                app === 'Safari'
                    ? 'Turn on Precise Location while you are there.'
                    : `Come back here and tap the button again. ${app} will ask this time.`,
            ],
            after: 'Then reload this page.',
        };
    }

    if (android) {
        const app = browser === 'samsung' ? 'Samsung Internet'
            : browser === 'firefox' ? 'Firefox'
                : browser === 'edge' ? 'Edge' : 'Chrome';

        return {
            device: `${app} on Android`,
            steps: [
                'Tap the icon to the left of the web address at the top of the screen.',
                'Open Permissions, find Location, and set it to Allow.',
                `If Location is not listed, open Settings, then Apps, then ${app}, then Permissions.`,
            ],
            after: 'Then reload this page.',
        };
    }

    if (mac && browser === 'safari') {
        return {
            device: 'Safari on a Mac',
            steps: [
                'Open the Safari menu, then Settings, then Websites, then Location.',
                'Find app.cedibites.com in the list and set it to Ask or Allow.',
                'Check System Settings, Privacy & Security, Location Services, and make sure Safari is on.',
            ],
            after: 'Then reload this page.',
        };
    }

    if (browser === 'firefox') {
        return {
            device: 'Firefox on a computer',
            steps: [
                'Click the padlock to the left of the web address.',
                'Under Location, click the small cross to clear the block.',
            ],
            after: 'Then reload this page and choose Allow.',
        };
    }

    return {
        device: browser === 'edge' ? 'Edge on a computer' : 'Chrome on a computer',
        steps: [
            'Click the icon to the left of the web address, usually a sliders or padlock symbol.',
            'Find Location and switch it to Allow.',
            mac
                ? 'On a Mac, also check System Settings, Privacy & Security, Location Services.'
                : 'On Windows, also check Settings, Privacy & security, Location.',
        ],
        after: 'Then reload this page.',
    };
}

/** True where the operating system, not the site, is the likely blocker. */
export function osHoldsTheSwitch(userAgent?: string): boolean {
    const ua = userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent);
    return readAgent(ua).ios;
}
