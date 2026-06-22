import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Paginated } from "@edufees/shared-types";
import { apiClient } from "../client";

export interface PlatformStats {
  totalSchools: number;
  activeSchools: number;
  suspendedSchools: number;
  totalStudents: number;
  totalUsers: number;
  mrr: number;
}

export interface PlatformAnalytics {
  growth: { month: string; institutes: number; revenue: number }[];
  planDistribution: { plan: string; count: number }[];
  mrr: number;
}

export interface SchoolDetail {
  id: string;
  name: string;
  slug: string;
  schoolType: string | null;
  city: string | null;
  state: string | null;
  addressLine1: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  isActive: boolean;
  createdAt: string;
  subscription: {
    plan: string;
    status: string;
    startDate: string;
    endDate: string;
    studentLimit: number | null;
  } | null;
  bankDetail: unknown;
  _count: { students: number; users: number };
}

export interface PlatformUser {
  id: string;
  email: string;
  username: string;
  role: string;
  schoolId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  schoolId: string | null;
  performedById: string;
  actorEmail: string | null;
  actorUsername: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ["super-admin", "stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<PlatformStats>("/super-admin/stats");
      return data;
    },
  });
}

export function usePlatformAnalytics() {
  return useQuery({
    queryKey: ["super-admin", "analytics"],
    queryFn: async () => {
      const { data } = await apiClient.get<PlatformAnalytics>(
        "/super-admin/analytics",
      );
      return data;
    },
  });
}

export function useSchoolDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["super-admin", "school", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await apiClient.get<SchoolDetail>(
        `/super-admin/schools/${id}`,
      );
      return data;
    },
  });
}

export function useOnboardSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post("/super-admin/schools", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["super-admin"] }),
  });
}

export function useUpdateSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const { data } = await apiClient.patch(`/super-admin/schools/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["super-admin"] }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ schoolId, payload }: { schoolId: string; payload: Record<string, unknown> }) => {
      const { data } = await apiClient.patch(
        `/super-admin/subscriptions/${schoolId}`,
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["super-admin"] }),
  });
}

export function usePlatformUsers(params: { page?: number; pageSize?: number; search?: string; schoolId?: string } = {}) {
  return useQuery({
    queryKey: ["super-admin", "users", params],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<PlatformUser>>(
        "/super-admin/users",
        { params },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreatePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post("/super-admin/users", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["super-admin", "users"] }),
  });
}

export function useUpdatePlatformUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const { data } = await apiClient.patch(`/super-admin/users/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["super-admin", "users"] }),
  });
}

export function useAuditLogs(params: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ["super-admin", "audit", params],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<AuditEntry>>(
        "/super-admin/audit",
        { params },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export interface PlatformSettings {
  platform: {
    name: string;
    supportEmail: string;
    supportPhone: string;
    website: string;
  };
  security: {
    maxAttempts: number;
    sessionTimeout: number;
    minPassword: number;
    twoFA: boolean;
    ipWhitelist: boolean;
  };
  notifications: {
    whatsappProvider: string;
    emailProvider: string;
    reminderDays: string;
    autoReminder: boolean;
  };
  gateways: {
    id: string;
    name: string;
    mode: string;
    keyId: string;
    active: boolean;
  }[];
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["super-admin", "settings"],
    queryFn: async () => {
      const { data } = await apiClient.get<PlatformSettings>(
        "/super-admin/settings",
      );
      return data;
    },
  });
}

export function useUpdatePlatformSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.patch("/super-admin/settings", payload);
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["super-admin", "settings"] }),
  });
}
