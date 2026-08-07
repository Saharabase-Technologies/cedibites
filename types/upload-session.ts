/**
 * types/upload-session.ts
 *
 * Phone-as-camera upload sessions.
 *
 * Everyone in the IMS works on a laptop, and nobody carries a laptop to a crate
 * of spoiled chicken on the floor. The desktop draws a QR code, a phone scans
 * it, and a no-login page attaches photos and video to exactly one document.
 *
 * Deliberately not wastage-shaped: deliveries and daily counts have the same
 * problem, and the backend is polymorphic so the frontend should be too.
 */

/** What the desktop may point a session at. Matches the backend whitelist. */
export type UploadSessionTargetType = 'wastage';

/** What a session is for. Governs the label the phone sees and how files land. */
export type UploadSessionPurpose = 'wastage_evidence';

export interface CreateUploadSessionPayload {
  /**
   * Omit BOTH target fields for a STAGED session - one with no document yet.
   *
   * That is what lets a form photograph the goods before it has been saved: the
   * files wait on the session, and the form claims them when it finally
   * creates the record. Without it, "use phone" had to save first, which closed
   * the form and took the notes and any further items with it.
   */
  target_type?: UploadSessionTargetType;
  target_id?: number;
  purpose: UploadSessionPurpose;
}

/** One file a phone sent to a staged session, before any document existed. */
export interface StagedFile {
  id: number;
  url: string;
  kind: 'image' | 'video';
  mime_type: string | null;
  original_name: string | null;
  /** True once the document was created and this was attached for real. */
  attached: boolean;
}

/**
 * What comes back from minting one.
 *
 * `url` is the ONLY place the raw token exists after this response — it is
 * hashed at rest on the server and can never be re-fetched. If the dialog is
 * closed before the phone scans, the code is gone and the button mints another.
 */
export interface UploadSession {
  id: number;
  /** Absolute HTTPS URL to draw as the QR code, e.g. app.cedibites.com/u/{token} */
  url: string;
  expires_at: string;
  expires_in_seconds: number;
  max_files: number;
}

/** The desktop's "how is it going?" poll. Never the file list — the document carries that. */
export interface UploadSessionStatus {
  id: number;
  /** No document yet - the form that minted this has not saved. */
  staging: boolean;
  /** What the phone has sent so far, so the form can show thumbnails. */
  files: StagedFile[];
  expires_at: string;
  expires_in_seconds: number;
  files_uploaded: number;
  max_files: number;
  usable: boolean;
  last_used_at: string | null;
}

/**
 * What the phone is told on arrival.
 *
 * A reference and one line of instruction, and nothing else. The token is a
 * bearer credential inside a screenshot-able square, so whoever holds it sees
 * this — it must be enough to confirm you are at the right crate and no more.
 */
export interface UploadTarget {
  reference: string;
  label: string;
  expires_at: string;
  expires_in_seconds: number;
  files_uploaded: number;
  max_files: number;
  remaining: number;
  accepts: {
    image_mimetypes: string[];
    video_mimetypes: string[];
    max_image_bytes: number;
    max_video_bytes: number;
  };
}

/** The result of one successful upload. */
export interface UploadResult {
  files_uploaded: number;
  max_files: number;
  remaining: number;
}
