import apiClient from '../client';
import type {
  ApplicationFormPayload,
  ApplicationStatus,
  CreateLinkPayload,
  RecruitmentApplication,
  RecruitmentLink,
  RecruitmentPosting,
} from '@/types/recruitment';

/**
 * Recruitment: the public form and the admin review queue.
 *
 * The public calls need no auth — the token in the URL is the only credential —
 * but they go through the same client so a closed link surfaces as an ordinary
 * ApiError rather than a raw axios rejection.
 */

function unwrap<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

/** Laravel paginators arrive as { data: { data: [], meta } }. */
function unwrapList<T>(response: unknown): { items: T[]; total: number } {
  const outer = response as { data?: { data?: T[]; total?: number; meta?: { total?: number } } };
  const inner = outer?.data;
  return {
    items: inner?.data ?? (Array.isArray(inner) ? (inner as T[]) : []),
    total: inner?.total ?? inner?.meta?.total ?? 0,
  };
}

export interface ApplicationListParams {
  /** Defaults to `pending` on the server. Pass 'all' for history. */
  status?: ApplicationStatus | 'all';
  recruitment_link_id?: number;
  branch_id?: number;
  per_page?: number;
}

export const recruitmentService = {
  // ─── Public ────────────────────────────────────────────────────────────────

  /**
   * What this link is hiring for. Throws on a closed link — expired and
   * never-existed answer identically by design, so there is nothing to tell
   * apart here either.
   */
  getPosting: async (token: string): Promise<RecruitmentPosting> => {
    const response = await apiClient.get(`/recruit/${token}`);
    return unwrap<RecruitmentPosting>(response);
  },

  submitApplication: async (token: string, payload: ApplicationFormPayload): Promise<void> => {
    await apiClient.post(`/recruit/${token}`, payload);
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────

  getLinks: async (): Promise<RecruitmentLink[]> => {
    const response = await apiClient.get('/admin/recruitment-links');
    return unwrapList<RecruitmentLink>(response).items;
  },

  createLink: async (payload: CreateLinkPayload): Promise<RecruitmentLink> => {
    const response = await apiClient.post('/admin/recruitment-links', payload);
    return unwrap<RecruitmentLink>(response);
  },

  getApplications: async (
    params: ApplicationListParams = {},
  ): Promise<{ items: RecruitmentApplication[]; total: number }> => {
    const response = await apiClient.get('/admin/recruitment-applications', { params });
    return unwrapList<RecruitmentApplication>(response);
  },

  getApplication: async (id: number): Promise<RecruitmentApplication> => {
    const response = await apiClient.get(`/admin/recruitment-applications/${id}`);
    return unwrap<RecruitmentApplication>(response);
  },

  /**
   * Approve, and create the account.
   *
   * The role is the only thing sent. The branch comes from the link on the
   * server, so there is no branch to pass and no way to land someone at a
   * branch they did not apply to.
   */
  approve: async (id: number, role: string): Promise<void> => {
    await apiClient.post(`/admin/recruitment-applications/${id}/approve`, { role });
  },

  /** Silent by decision — the applicant is told nothing. */
  reject: async (id: number): Promise<void> => {
    await apiClient.post(`/admin/recruitment-applications/${id}/reject`);
  },
};
