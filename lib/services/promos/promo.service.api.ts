import apiClient from '@/lib/api/client';
import type { Promo, PromoService } from './promo.service';

interface ApiPromo {
  id: string;
  name: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  scope: 'global' | 'branch';
  branchIds?: string[];
  appliesTo: 'order' | 'items';
  itemIds: string[];
  minOrderValue?: number | null;
  maxOrderValue?: number | null;
  maxDiscount?: number | null;
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
    type: raw.type,
    value: Number(raw.value) || 0,
    scope: raw.scope,
    branchIds: raw.branchIds ?? [],
    appliesTo: raw.appliesTo ?? 'order',
    itemIds: Array.isArray(raw.itemIds) ? raw.itemIds.map(String) : [],
    minOrderValue: raw.minOrderValue != null ? Number(raw.minOrderValue) : undefined,
    maxOrderValue: raw.maxOrderValue != null ? Number(raw.maxOrderValue) : undefined,
    maxDiscount: raw.maxDiscount != null ? Number(raw.maxDiscount) : undefined,
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
  if (p.minOrderValue != null) body.min_order_value = p.minOrderValue;
  if (p.maxOrderValue != null) body.max_order_value = p.maxOrderValue;
  if (p.maxDiscount != null) body.max_discount = p.maxDiscount;
  if (p.startDate != null) body.start_date = p.startDate;
  if (p.endDate != null) body.end_date = p.endDate;
  if (p.isActive != null) body.is_active = p.isActive;
  if (p.accountingCode != null) body.accounting_code = p.accountingCode;
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

  async resolvePromo(itemIds: string[], branchId: string, subtotal?: number): Promise<Promo | null> {
    const response = await apiClient.post('/promos/resolve', {
      item_ids: itemIds.map((id) => parseInt(String(id), 10)).filter((n) => !Number.isNaN(n)),
      branch_id: branchId,
      subtotal: subtotal ?? 0,
    });
    const raw = extractData<ApiPromo | null>(response);
    if (!raw?.id) return null;
    return toPromo(raw);
  }

  calculateDiscount(promo: Promo, subtotal: number): number {
    let discount: number;
    if (promo.type === 'percentage') {
      discount = Math.round((subtotal * promo.value) / 100 * 100) / 100;
      if (promo.maxDiscount != null) discount = Math.min(discount, promo.maxDiscount);
    } else {
      discount = Math.min(promo.value, subtotal);
    }
    return discount;
  }
}
