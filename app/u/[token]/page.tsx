import type { Metadata } from 'next';
import { PhoneUpload } from './_components/PhoneUpload';

/**
 * The page a phone lands on after scanning a QR code on somebody's laptop.
 *
 * No login, no navigation, no way back into the app. The token in the URL is
 * the entire credential and it only permits attaching files to one document.
 */
export const metadata: Metadata = {
  title: 'Send a photo',
  // The URL contains a live credential. It must never be indexed, and search
  // engines must not follow it or keep it in a cache after it expires.
  robots: { index: false, follow: false, nocache: true },
};

export default async function UploadSessionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <PhoneUpload token={token} />;
}
