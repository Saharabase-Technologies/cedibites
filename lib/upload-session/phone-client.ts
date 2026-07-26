/**
 * lib/upload-session/phone-client.ts
 *
 * The PHONE half of phone-as-camera. Deliberately standalone.
 *
 * This runs on whatever handset the branch manager has, on mobile data, in a
 * store room, with no login. So it uses plain fetch and XHR rather than the
 * shared axios client, and that is a decision rather than an oversight:
 *
 *   - the shared client attaches whatever auth token is in localStorage and
 *     redirects on 401. Neither is wanted here: the token in the URL is the
 *     entire credential, and there is no session to expire.
 *   - it drags in the feedback breadcrumb layer, which has no business
 *     recording an unauthenticated stranger's requests.
 *   - fetch cannot report UPLOAD progress. A 40 MB clip over 3G with no
 *     progress bar looks exactly like a hung page, and the user re-taps and
 *     sends it twice. XHR can, so the upload path uses XHR.
 */

import type { UploadResult, UploadTarget } from '@/types/upload-session';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1').replace(/\/$/, '');

/** The API envelope. `message` is written to be read by a person holding a phone. */
interface Envelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

function messageFrom(body: unknown, fallback: string): string {
  const m = (body as Envelope<unknown>)?.message;
  return typeof m === 'string' && m.trim() !== '' ? m : fallback;
}

/**
 * Why the page could not open, and it matters which.
 *
 * A dead token and a dropped signal look identical to naive error handling, and
 * telling someone in a store room "this code will not work" when the truth is
 * "you have no bars" sends them back up to the laptop to mint a code they
 * already have. `network` is retryable; `invalid` is not.
 */
export class UploadSessionError extends Error {
  constructor(
    message: string,
    public readonly kind: 'network' | 'invalid',
  ) {
    super(message);
    this.name = 'UploadSessionError';
  }
}

/**
 * What this code points at: a reference and one line of instruction.
 *
 * A 404 here is the normal unhappy path, not an exception — expired, revoked,
 * full, or simply never real. The server gives them all the same shape of
 * answer on purpose, so this must not try to tell them apart.
 */
export async function fetchUploadTarget(token: string, signal?: AbortSignal): Promise<UploadTarget> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/upload-sessions/${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (e) {
    // An abort is the component unmounting, not a failure - let it through
    // untouched so the caller can ignore it.
    if ((e as Error)?.name === 'AbortError') throw e;

    throw new UploadSessionError(
      'Could not reach CediBites. Check the signal and try again.',
      'network',
    );
  }

  const body = (await response.json().catch(() => null)) as Envelope<UploadTarget> | null;

  // A 5xx or an nginx error page is the server being unwell, not the code being
  // dead. Offering a retry is right; sending someone back to the laptop is not.
  if (response.status >= 500) {
    throw new UploadSessionError('CediBites is not answering. Try again in a moment.', 'network');
  }

  if (!response.ok || !body?.data) {
    throw new UploadSessionError(
      messageFrom(body, 'This link is not valid. Show the QR code again on the computer to get a new one.'),
      'invalid',
    );
  }

  return body.data;
}

export interface UploadOptions {
  caption?: string;
  /** 0-100, or null once the phone has finished sending and is waiting on the server. */
  onProgress?: (percent: number | null) => void;
  signal?: AbortSignal;
}

/**
 * Send one file.
 *
 * ONE per request, on purpose. A phone that loses a 40 MB multi-file POST at
 * 90% has nothing to show for the minute it spent; three separate requests lose
 * only the one that failed, and the page can offer to retry that alone.
 */
export function uploadFile(
  token: string,
  file: File,
  { caption, onProgress, signal }: UploadOptions = {},
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    if (caption) form.append('caption', caption);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/upload-sessions/${encodeURIComponent(token)}/files`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const percent = Math.round((e.loaded / e.total) * 100);
      // Hold at 99 until the server answers. Showing 100% while the request is
      // still open reads as "done" and people walk away from a page that has
      // not been told whether the file was accepted.
      onProgress?.(percent >= 100 ? 99 : percent);
    };

    xhr.onload = () => {
      const body = (() => {
        try {
          return JSON.parse(xhr.responseText) as Envelope<UploadResult>;
        } catch {
          return null;
        }
      })();

      if (xhr.status >= 200 && xhr.status < 300 && body?.data) {
        onProgress?.(100);
        resolve(body.data);
        return;
      }

      // 413 never reaches the app: nginx refuses an oversized body itself and
      // returns its own HTML page, so there is no `message` to show. Say the
      // useful thing rather than "unknown error".
      if (xhr.status === 413) {
        reject(new Error('That file is too big to send. Record a shorter clip, about 15 seconds.'));
        return;
      }

      reject(new Error(messageFrom(body, 'That file could not be sent. Try again.')));
    };

    xhr.onerror = () =>
      reject(new Error('The connection dropped. Check the signal and try again.'));
    xhr.ontimeout = () => reject(new Error('That took too long. Try again where the signal is better.'));
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));

    signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    // Generous: a 50 MB clip on a bad connection is legitimately slow, and
    // timing it out is worse than letting it grind.
    xhr.timeout = 5 * 60 * 1000;

    xhr.send(form);
  });
}

/**
 * Reject a file the server is certain to refuse, before spending a minute of
 * mobile data proving it. Mirrors `App\Rules\EvidenceMedia`; the server is
 * still the authority, this is only politeness.
 */
export function localRejection(file: File, accepts: UploadTarget['accepts']): string | null {
  const type = (file.type || '').toLowerCase();
  const isVideo = accepts.video_mimetypes.includes(type) || type.startsWith('video/');
  const isImage = accepts.image_mimetypes.includes(type) || type.startsWith('image/');

  // An empty `file.type` happens on some Android pickers. Let it through and
  // let the server sniff it, rather than refusing a real photo.
  if (type !== '' && !isImage && !isVideo) {
    return 'That is not a photo or a video.';
  }

  const cap = isVideo ? accepts.max_video_bytes : accepts.max_image_bytes;

  if (file.size > cap) {
    const mb = Math.round(cap / (1024 * 1024));
    return isVideo
      ? `That clip is too big (limit ${mb} MB). Record about 15 seconds instead.`
      : `That photo is too big (limit ${mb} MB).`;
  }

  return null;
}
