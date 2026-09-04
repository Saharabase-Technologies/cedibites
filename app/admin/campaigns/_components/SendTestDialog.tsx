'use client';

import { useMemo, useState } from 'react';
import { PaperPlaneTiltIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { InventoryModal, FormField, TextInput, PrimaryButton } from '@/app/inventory/_components';
import { useCampaignMutations, useCampaignSegments } from '@/lib/api/hooks/useCampaigns';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { measureMessage } from '@/lib/sms/meter';
import { GHS } from '@/lib/sms/cost';
import { toast } from '@/lib/utils/toast';
import type { Campaign } from '@/types/marketing';

/**
 * One copy of this campaign, to one handset, before the real send.
 *
 * The message is shown but never editable. A test you can retype is not a test
 * of anything: the whole reason to send one is to find out what these exact
 * characters do on a phone, and whether the short link survived the paste.
 *
 * It says plainly that this reaches the real number. This is the second send in
 * the console that ignores test mode, and it has to, since a test delivered to
 * the staff list would show somebody else's phone as proof that yours is fine.
 */
export function SendTestDialog({
    campaign,
    onClose,
    onSent,
}: {
    campaign: Campaign;
    onClose: () => void;
    onSent: () => void;
}) {
    const { staffUser } = useStaffAuth();
    const { test } = useCampaignMutations();
    const { ratePerSegment } = useCampaignSegments();

    /*
     * Opens holding your own number, because you are who a test is nearly always
     * for. Still free to type, since the other real case is walking to a
     * colleague's desk and using theirs.
     *
     * Seeded at mount rather than reset by an effect, which is why the caller
     * renders this only while the dialog is open. An effect that writes state on
     * open is the shape that leaves a stale number in the field.
     */
    const [phone, setPhone] = useState(staffUser?.phone ?? '');
    const [error, setError] = useState<string | null>(null);

    // Measured in the browser for the line below; the server measures it again
    // and is the authority on what it costs.
    const metered = useMemo(() => measureMessage(campaign.message), [campaign.message]);

    const send = async () => {
        if (!phone.trim()) return;
        setError(null);

        try {
            await test.mutateAsync({ id: campaign.id, phone: phone.trim() });
            toast.success('Test sent. Check the handset.');
            onSent();
        } catch (e) {
            const detail =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'That test could not be sent.';
            setError(detail);
        }
    };

    return (
        <InventoryModal isOpen onClose={onClose} title="Send yourself a test" size="md">
            <div className="space-y-4">
                <p className="text-neutral-gray text-sm font-body leading-relaxed">
                    One text, to one number, with this campaign&apos;s exact words. Nothing about the campaign
                    changes and nobody else is messaged.
                </p>

                <FormField label="To" required hint="Yours by default. Type another number to send it elsewhere.">
                    <TextInput
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0241234567"
                        inputMode="tel"
                        autoFocus
                    />
                </FormField>

                {/* Read-only on purpose. A test you can edit tests the edit, not the campaign. */}
                <div>
                    <p className="text-neutral-gray text-xs font-body uppercase tracking-wide mb-2">
                        What will arrive
                    </p>
                    <div className="rounded-2xl bg-neutral-light/60 px-4 py-3">
                        <p className="text-text-dark text-sm font-body whitespace-pre-wrap">{campaign.message}</p>
                    </div>
                    <p className="text-neutral-gray text-xs font-body mt-2">
                        {metered.characters} characters ·{' '}
                        {metered.segments === 1 ? '1 text' : `${metered.segments} texts`} ·{' '}
                        costs us {GHS(metered.segments * ratePerSegment)}
                    </p>
                </div>

                {metered.encoding === 'UCS_2' && (
                    <p className="text-amber-700 text-xs font-body leading-relaxed">
                        <span className="font-mono text-text-dark">{metered.non_gsm_characters.join('  ')}</span> cut
                        the limit from 160 characters to 70, so this costs {metered.segments} texts a person instead
                        of fewer. Worth seeing on a handset before you decide whether to swap them.
                    </p>
                )}

                <div className="flex gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <WarningCircleIcon size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-text-dark text-xs font-body leading-relaxed">
                        This reaches the real number straight away, whatever the campaign test settings say.
                    </p>
                </div>

                {error && (
                    <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={16} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-rose-700 text-sm font-body">{error}</p>
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer min-h-11"
                    >
                        Cancel
                    </button>
                    <PrimaryButton
                        onClick={send}
                        disabled={!phone.trim() || test.isPending}
                        className="w-auto px-5 flex items-center justify-center gap-2"
                    >
                        <PaperPlaneTiltIcon size={15} weight="fill" />
                        {test.isPending ? 'Sending…' : 'Send the test'}
                    </PrimaryButton>
                </div>
            </div>
        </InventoryModal>
    );
}
