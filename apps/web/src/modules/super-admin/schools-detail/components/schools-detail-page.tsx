"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Topbar } from "@/modules/shared/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card";
import { Button } from "@/modules/shared/ui/button";
import { Badge } from "@/modules/shared/ui/badge";
import {
  useSchoolDetail,
  useUpdateSchool,
  useUpdateSubscription,
  usePlatformUsers,
} from "@/lib/api/hooks/useSuperAdmin";
import {
  ArrowLeft, Users, GraduationCap, CheckCircle, XCircle, Edit2,
  Mail, Phone, MapPin, Calendar, Shield, Briefcase, BookOpen, UserCheck,
  X, AlertTriangle,
} from "lucide-react";

const planColors: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-600",
  STARTER: "bg-blue-100 text-blue-700",
  GROWTH: "bg-indigo-100 text-indigo-700",
  ENTERPRISE: "bg-purple-100 text-purple-700",
};

const roleMeta: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  SCHOOL_ADMIN: { label: "School Admin", color: "bg-indigo-100 text-indigo-700", icon: Shield },
  ACCOUNTANT: { label: "Accountant", color: "bg-green-100 text-green-700", icon: Briefcase },
  TEACHER: { label: "Teacher", color: "bg-orange-100 text-orange-700", icon: BookOpen },
  PARENT: { label: "Parent", color: "bg-blue-100 text-blue-700", icon: UserCheck },
};

export function SchoolsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const schoolQuery = useSchoolDetail(id);
  const usersQuery = usePlatformUsers({ schoolId: id, pageSize: 200 });
  const updateSchool = useUpdateSchool();
  const updateSubscription = useUpdateSubscription();

  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const school = schoolQuery.data;

  if (schoolQuery.isLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-6">
        <p className="text-gray-500">Loading institute...</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-6">
        <p className="text-gray-500">Institute not found.</p>
        <Button className="mt-4" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const plan = school.subscription?.plan ?? "FREE";
  const isActive = school.isActive;
  const users = usersQuery.data?.data ?? [];
  const roleCounts = users.reduce((acc: Record<string, number>, u: any) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  const handleToggleStatus = () => {
    updateSchool.mutate(
      { id: school.id, payload: { isActive: !isActive } },
      {
        onSuccess: () => {
          showToast(!isActive ? `✅ ${school.name} activated` : `⚠️ ${school.name} suspended`);
          setShowConfirm(false);
        },
        onError: () => showToast("❌ Failed to update status"),
      },
    );
  };

  const handleEditSave = () => {
    const isPlanChanged = editForm.plan && editForm.plan !== plan;
    updateSchool.mutate(
      {
        id: school.id,
        payload: {
          name: editForm.name,
          city: editForm.city,
          state: editForm.state,
          primaryPhone: editForm.phone,
        },
      },
      {
        onSuccess: () => {
          if (isPlanChanged && editForm.plan) {
            updateSubscription.mutate({
              schoolId: school.id,
              payload: { plan: editForm.plan.toUpperCase() }
            });
          }
          setShowEdit(false);
          showToast("✅ Institute details updated successfully");
        },
        onError: () => showToast("❌ Failed to update institute details"),
      }
    );
  };

  return (
    <div className="flex flex-col flex-1">
      <Topbar title={school.name} subtitle={`${school.city ?? "—"}, ${school.state ?? "—"} · ${plan} Plan`} />
      <main className="flex-1 p-6 space-y-5">

        {toast && (
          <div className="fixed top-5 right-5 z-[999] bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl">{toast}</div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back to Institutes
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              setEditForm({ name: school.name, city: school.city || "", state: school.state || "", phone: school.primaryPhone || "", plan });
              setShowEdit(true);
            }}>
              <Edit2 className="w-4 h-4" /> Edit
            </Button>
            {isActive
              ? <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowConfirm(true)}>
                  <XCircle className="w-4 h-4" />Suspend
                </Button>
              : <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setShowConfirm(true)}>
                  <CheckCircle className="w-4 h-4" />Activate
                </Button>
            }
          </div>
        </div>

        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">{school.name}</h2>
                {isActive ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Suspended</Badge>}
                <span className={`text-xs px-2 py-1 rounded-md font-semibold ${planColors[plan] ?? planColors.FREE}`}>{plan}</span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                {school.addressLine1 && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{school.addressLine1}</span>}
                {school.primaryEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{school.primaryEmail}</span>}
                {school.primaryPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{school.primaryPhone}</span>}
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Joined {new Date(school.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Students</p>
                <p className="text-2xl font-bold text-gray-900">{school._count.students.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-orange-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Users</p>
                <p className="text-2xl font-bold text-gray-900">{school._count.users.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div>
              <p className="text-xs text-gray-500">Subscription</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{school.subscription?.status ?? "—"}</p>
              <p className="text-xs text-gray-500">Limit: {school.subscription?.studentLimit ?? "Unlimited"}</p>
            </div>
          </Card>
          <Card className="p-5">
            <div>
              <p className="text-xs text-gray-500">Slug</p>
              <p className="text-sm font-mono font-bold text-gray-900 mt-1">{school.slug}</p>
              <p className="text-xs text-gray-500">{school.schoolType ?? "—"}</p>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" />Users by Role</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(roleCounts).length === 0 && <p className="text-sm text-gray-400">No users found</p>}
            {Object.entries(roleCounts).map(([role, count]) => {
              const meta = roleMeta[role] ?? { label: role, color: "bg-gray-100 text-gray-600", icon: Users };
              const Icon = meta.icon;
              return (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm text-gray-700">{meta.label}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[400px] p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-red-100" : "bg-green-100"}`}>
                  <AlertTriangle className={`w-5 h-5 ${isActive ? "text-red-500" : "text-green-600"}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{isActive ? "Suspend Institute?" : "Activate Institute?"}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {isActive
                      ? `All users of ${school.name} will immediately lose access.`
                      : `${school.name} and all its users will regain access.`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button onClick={handleToggleStatus}
                  className={isActive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}>
                  {isActive ? "Yes, Suspend" : "Yes, Activate"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {showEdit && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[480px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Edit Institute — {school.name}</h3>
                <button onClick={() => setShowEdit(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ["Institute Name", "name", "text"],
                  ["City", "city", "text"],
                  ["State", "state", "text"],
                  ["Phone", "phone", "text"],
                ].map(([label, key, type]) => (
                  <div key={key as string} className={key === "name" ? "col-span-2" : ""}>
                    <label className="text-xs text-gray-500 font-medium">{label as string}</label>
                    <input type={type as string} value={editForm[key as string] || ""} onChange={e => setEditForm((f: any) => ({ ...f, [key as string]: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 font-medium">Plan</label>
                  <select value={editForm.plan || plan} onChange={e => setEditForm((f: any) => ({ ...f, plan: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                    {["Free", "Starter", "Growth", "Enterprise"].map(p => <option key={p} value={p.toUpperCase()}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
                <Button onClick={handleEditSave}>Save Changes</Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
