'use client';

import { useMemo, useState } from 'react';
import { PaperPlaneTiltIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { InventoryModal, FormField, TextInput, Textarea, PrimaryButton } from '@/app/inventory/_components';
import { campaignService } from '@/lib/api/services/campaign.service';
import { useCampaignSegments } from '@/lib/api/hooks/useCampaigns';
import { measureMessage } from '@/lib/sms/meter';
import { GHS, GHSRate } from '@/lib/sms/cost';
import { toast } from '@/lib/utils/toast';

/**
 * One text, to one number, now.
 *
 * No wizard and no confirm step. A campaign gets four screens and a confirmation
 * because it reaches thousands of people and cannot be recalled; this reaches one
 * person and costs about two pesewas, and wrapping it in the same ceremony would
 * just send staff back to their own handsets — where nothing is recorded at all.
 *
 * It does say plainly that the message goes to the real number immediately, since
 * this is the one send in the console that ignores seed mode.
 */
export function SendDirectDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const { ratePerSegment } = useCampaignSegments();

    // Measured in the browser for the live counter; the server measures it again
    // and is the authority on what it costs.
    const metered = useMemo(() => measureMessage(message), [message]);
    const cost = metered.segments * ratePerSegment;

    const close = () => {
        setPhone('');
        setMessage('');
        onClose();
    };

    const send = async () => {
        if (!phone.trim() || !message.trim()) return;

        setSending(true);
        try {
            const result = await campaignService.sendDirect(phone.trim(), message.trim());
            toast.success(`Sent to ${result.phone}.`);
            close();
        } catch (e) {
            const detail =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'That message could not be sent.';
            toast.error(detail);
        } finally {
            setSending(false);
        }
    };

    return (
        <InventoryModal isOpen={isOpen} onClose={close} title="Send a text" size="md">
            <div className="space-y-4">
                <FormField label="To" required>
                    <TextInput
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0241234567"
                        inputMode="tel"
                    />
                </FormField>

                <FormField label="Message" required>
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        placeholder="Your order is on its way."
                    />
                </FormField>

                {message.trim() !== '' && (
                    <div className="rounded-xl border border-[#f0e8d8] px-4 py-3 text-xs font-body space-y-1">
                        <p className="text-neutral-gray">
                            {metered.characters} characters ·{' '}
                            {metered.segments === 1 ? '1 text' : `${metered.segments} texts`}
                            {metered.encoding === 'UCS_2' && ' · special characters shorten each text to 70'}
                        </p>
                        <p className="text-text-dark font-semibold">
                            Costs us {GHS(cost)}
                            <span className="text-neutral-gray font-normal">
                                {' '}({metered.segments} × {GHSRate(ratePerSegment)})
                            </span>
                        </p>
                    </div>
                )}

                {/* The one send in this console that ignores seed mode. */}
                <div className="flex gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <WarningCircleIcon size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-text-dark text-xs font-body leading-relaxed">
                        This goes to the real number straight away, whatever the campaign test settings
                        say, and it cannot be recalled.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={close}
                        className="px-4 py-2.5 text-sm font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <PrimaryButton
                        onClick={send}
                        disabled={!phone.trim() || !message.trim() || sending}
                        className="w-auto px-5 flex items-center justify-center gap-2"
                    >
                        <PaperPlaneTiltIcon size={15} weight="fill" />
                        {sending ? 'Sending…' : 'Send'}
                    </PrimaryButton>
                </div>
            </div>
        </InventoryModal>
    );
}
