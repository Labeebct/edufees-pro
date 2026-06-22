import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { DiscountType, Paginated } from "@edufees/shared-types";
import { apiClient } from "../client";

// ---- Reports ----
export interface DashboardStats {
  totalStudents: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardStats>("/reports/dashboard");
      return data;
    },
  });
}

export function useMonthlyCollection() {
  return useQuery({
    queryKey: ["reports", "monthly"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ month: string; collected: number }[]>(
        "/reports/monthly-collection",
      );
      return data;
    },
  });
}

export function useClassWiseCollection() {
  return useQuery({
    queryKey: ["reports", "class-wise"],
    queryFn: async () => {
      const { data } = await apiClient.get<
        { class: string; total: number; collected: number; percent: number }[]
      >("/reports/class-wise");
      return data;
    },
  });
}

export function usePaymentModes() {
  return useQuery({
    queryKey: ["reports", "payment-modes"],
    queryFn: async () => {
      const { data } = await apiClient.get<
        { mode: string; amount: number; count: number; percent: number }[]
      >("/reports/payment-modes");
      return data;
    },
  });
}

export function useQuotaWise() {
  return useQuery({
    queryKey: ["reports", "quota-wise"],
    queryFn: async () => {
      const { data } = await apiClient.get<
        { name: string; collected: number; total: number }[]
      >("/reports/quota-wise");
      return data;
    },
  });
}

// ---- Coupons ----
export interface CouponDto {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: string | number;
  validFrom: string;
  validUntil: string;
  maxUses: number | null;
  perStudentLimit: number;
  totalRedeemed: number;
  isActive: boolean;
}

export function useCoupons() {
  return useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data } = await apiClient.get<CouponDto[]>("/coupons");
      return data;
    },
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post("/coupons", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const { data } = await apiClient.patch(`/coupons/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
}

export interface CouponAssignmentDto {
  id: string;
  couponId: string;
  couponCode: string;
  discountType: DiscountType;
  discountValue: number;
  studentId: string;
  studentName: string;
  admissionNo: string;
}

export function useCouponAssignments() {
  return useQuery({
    queryKey: ["coupons", "assignments"],
    queryFn: async () => {
      const { data } = await apiClient.get<CouponAssignmentDto[]>(
        "/coupons/assignments",
      );
      return data;
    },
  });
}

export function useAssignCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { couponId: string; studentIds: string[] }) => {
      const { data } = await apiClient.post("/coupons/assignments", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
}

export function useDeleteCouponAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/coupons/assignments/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
}

// ---- Invoices ----
export interface InvoiceListItem {
  id: string;
  invoiceNo: string;
  studentName: string;
  class: string;
  amount: number;
  date: string;
  sentEmail: boolean;
  sentWA: boolean;
  hasPdf: boolean;
}

export function useInvoices(params: { page?: number; pageSize?: number; search?: string } = {}) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<InvoiceListItem>>(
        "/invoices",
        { params },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, channel }: { id: string; channel: "EMAIL" | "WHATSAPP" }) => {
      const { data } = await apiClient.post(`/invoices/${id}/send`, { channel });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post("/invoices/generate", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/invoices/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

// ---- Notifications ----
export interface NotificationLogItem {
  id: string;
  studentId: string | null;
  channel: string;
  template: string;
  recipient: string;
  message: string;
  status: string;
  sentAt: string;
}

export function useNotificationLogs(params: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<NotificationLogItem>>(
        "/notifications",
        { params },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post("/notifications/broadcast", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useSendReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post("/notifications/reminders", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ---- Super admin ----
export interface SchoolListItem {
  id: string;
  name: string;
  slug: string;
  schoolType: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  adminEmail: string | null;
  isActive: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
  studentCount: number;
  userCount: number;
  createdAt: string;
}

export function useSchools(params: { page?: number; pageSize?: number; search?: string } = {}) {
  return useQuery({
    queryKey: ["super-admin", "schools", params],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<SchoolListItem>>(
        "/super-admin/schools",
        { params },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: ["super-admin", "subscriptions"],
    queryFn: async () => {
      const { data } = await apiClient.get<
        {
          id: string;
          schoolId: string;
          plan: string;
          status: string;
          startDate: string;
          endDate: string;
          school: { name: string; slug: string };
        }[]
      >("/super-admin/subscriptions");
      return data;
    },
  });
}
