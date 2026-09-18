import apiClient from '@/lib/api/client';
import type { GenerateCodesInput, Promo, PromoCodeRow, PromoOffer, PromoOfferInput, PromoRedemption, PromoService } from './promo.service';

interface ApiPromo {
  id: string;
  name: string;
  code?: string | null;
  redemption?: PromoRedemption;
  type: 'percentage' | 'fixed_amount';
  value: number;
  scope: 'global' | 'branch';
  branchIds?: string[];
  appliesTo: 'order' | 'items';
  itemIds: string[];
  minOrderValue?: number | null;
  maxOrderValue?: number | null;
  maxDiscount?: number | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  firstOrderOnly?: boolean;
  timesUsed?: number;
  codesCount?: number;
  codesUsed?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  accountingCode?: string | null;
}

function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

function toPromo(raw: ApiPromo): Promo {
  return {
    id: String(raw.id),
    name: raw.name,
    code: raw.code ?? undefined,
    // A promo from before `redemption` existed reads the way it behaved.
    redemption: raw.redemption ?? (raw.code ? 'shared_code' : 'automatic'),
    type: raw.type,
    value: Number(raw.value) || 0,
    scope: raw.scope,
    branchIds: raw.branchIds ?? [],
    appliesTo: raw.appliesTo ?? 'order',
    itemIds: Array.isArray(raw.itemIds) ? raw.itemIds.map(String) : [],
    minOrderValue: raw.minOrderValue != null ? Number(raw.minOrderValue) : undefined,
    maxOrderValue: raw.maxOrderValue != null ? Number(raw.maxOrderValue) : undefined,
    maxDiscount: raw.maxDiscount != null ? Number(raw.maxDiscount) : undefined,
    maxUses: raw.maxUses != null ? Number(raw.maxUses) : undefined,
    maxUsesPerCustomer: raw.maxUsesPerCustomer != null ? Number(raw.maxUsesPerCustomer) : undefined,
    firstOrderOnly: Boolean(raw.firstOrderOnly),
    timesUsed: raw.timesUsed != null ? Number(raw.timesUsed) : undefined,
    codesCount: raw.codesCount != null ? Number(raw.codesCount) : undefined,
    codesUsed: raw.codesUsed != null ? Number(raw.codesUsed) : undefined,
    startDate: raw.startDate,
    endDate: raw.endDate,
    isActive: Boolean(raw.isActive),
    accountingCode: raw.accountingCode ?? undefined,
  };
}

function toApiBody(p: Partial<Promo>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (p.name != null) body.name = p.name;
  if (p.type != null) body.type = p.type;
  if (p.value != null) body.value = p.value;
  if (p.scope != null) body.scope = p.scope;
  if (p.branchIds != null) body.branch_ids = p.branchIds;
  if (p.appliesTo != null) body.applies_to = p.appliesTo;
  if (p.itemIds != null) body.item_ids = p.itemIds;
  if (p.startDate != null) body.start_date = p.startDate;
  if (p.endDate != null) body.end_date = p.endDate;
  if (p.isActive != null) body.is_active = p.isActive;
  if (p.redemption != null) body.redemption = p.redemption;
  if (p.firstOrderOnly != null) body.first_order_only = p.firstOrderOnly;

  // Fields that can be emptied. A key present in the patch is sent, and empty
  // goes as null. Checking the value instead of the key left an emptied field
  // out of the request, so clearing a cap or a limit on an edited promo kept
  // the old one without a word.
  const clearable: [keyof Promo, string][] = [
    ['minOrderValue', 'min_order_value'],
    ['maxOrderValue', 'max_order_value'],
    ['maxDiscount', 'max_discount'],
    ['maxUses', 'max_uses'],
    ['maxUsesPerCustomer', 'max_uses_per_customer'],
    ['accountingCode', 'accounting_code'],
    ['code', 'code'],
  ];
  for (const [key, field] of clearable) {
    if (key in p) body[field] = p[key] === '' || p[key] === undefined ? null : p[key];
  }
  return body;
}

export class ApiPromoService implements PromoService {
  async getAll(): Promise<Promo[]> {
    const response = await apiClient.get('/promos');
    const payload = extractData<ApiPromo[] | { data?: ApiPromo[] }>(response);
    const list = Array.isArray(payload) ? payload : (payload as { data?: ApiPromo[] })?.data ?? [];
    return (list as ApiPromo[]).map(toPromo);
  }

  async getById(id: string): Promise<Promo | null> {
    try {
      const response = await apiClient.get(`/promos/${id}`);
      const raw = extractData<ApiPromo>(response);
      if (!raw?.id) return null;
      return toPromo(raw);
    } catch {
      return null;
    }
  }

  async create(promo: Omit<Promo, 'id'>): Promise<Promo> {
    const body = {
      ...toApiBody(promo),
      branch_ids: promo.branchIds ?? (promo.scope === 'branch' ? [] : null),
      item_ids: promo.itemIds ?? [],
      is_active: promo.isActive ?? true,
    };
    const response = await apiClient.post('/promos', body);
    const raw = extractData<ApiPromo>(response);
    return toPromo(raw);
  }

  async update(id: string, patch: Partial<Promo>): Promise<Promo> {
    const response = await apiClient.patch(`/promos/${id}`, toApiBody(patch));
    const raw = extractData<ApiPromo>(response);
    return toPromo(raw);
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/promos/${id}`);
  }

  async offer(input: PromoOfferInput): Promise<PromoOffer> {
    const response = await apiClient.post('/promos/offer', {
      branch_id: input.branchId,
      lines: input.lines.map((l) => ({ menu_item_id: Number(l.menuItemId), amount: l.amount })),
      subtotal: input.subtotal,
      code: input.code || undefined,
      phone: input.phone || undefined,
    });
    const raw = extractData<{ promo: ApiPromo | null; discount: number; code_beaten: boolean; applied_code?: string | null }>(response);
    return {
      promo: raw?.promo?.id ? toPromo(raw.promo) : null,
      discount: Number(raw?.discount) || 0,
      codeBeaten: Boolean(raw?.code_beaten),
      appliedCode: raw?.applied_code ?? null,
    };
  }

  async listCodes(promoId: string): Promise<PromoCodeRow[]> {
    const response = await apiClient.get(`/promos/${promoId}/codes`);
    const rows = extractData<PromoCodeRow[]>(response);
    return Array.isArray(rows) ? rows : [];
  }

  async generateCodes(promoId: string, input: GenerateCodesInput): Promise<PromoCodeRow[]> {
    const response = await apiClient.post(`/promos/${promoId}/codes`, {
      count: input.count,
      prefix: input.prefix || undefined,
      batch: input.batch || undefined,
    });
    const rows = extractData<PromoCodeRow[]>(response);
    return Array.isArray(rows) ? rows : [];
  }

  async deleteCode(promoId: string, codeId: string): Promise<void> {
    await apiClient.delete(`/promos/${promoId}/codes/${codeId}`);
  }
}
