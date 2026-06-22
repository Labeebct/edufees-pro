"use client";
import { useState } from "react";
import { Topbar } from "@/modules/shared/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card";
import { Button } from "@/modules/shared/ui/button";
import { Badge } from "@/modules/shared/ui/badge";
import { usePlatformUsers, useCreatePlatformUser, useUpdatePlatformUser, type PlatformUser } from "@/lib/api/hooks/useSuperAdmin";
import { Search, Plus, Edit2, Lock, Unlock, Shield, User, Building2, X, AlertTriangle } from "lucide-react";

const roleColors: Record<string, string> = {
  SCHOOL_ADMIN: "bg-indigo-100 text-indigo-700",
  ACCOUNTANT: "bg-green-100 text-green-700",
  TEACHER: "bg-orange-100 text-orange-700",
  PARENT: "bg-blue-100 text-blue-700",
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
};

const roleLabel: Record<string, string> = {
  SCHOOL_ADMIN: "School Admin",
  ACCOUNTANT: "Accountant",
  TEACHER: "Teacher",
  PARENT: "Parent",
  SUPER_ADMIN: "Super Admin",
};

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const usersQuery = usePlatformUsers({ pageSize: 200, search: search || undefined });
  const users = usersQuery.data?.data ?? [];

  const createUser = useCreatePlatformUser();
  const updateUser = useUpdatePlatformUser();

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<PlatformUser | null>(null);
  const [showConfirm, setShowConfirm] = useState<PlatformUser | null>(null);
  const [form, setForm] = useState<any>({});

  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const filtered = users.filter((u: PlatformUser) =>
    (roleFilter === "all" || u.role === roleFilter) &&
    (u.email.toLowerCase().includes(search.toLowerCase()) ||
     u.username.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = () => {
    createUser.mutate(form, {
      onSuccess: () => {
        setShowAdd(false);
        showToast("✅ User created successfully");
      },
      onError: () => showToast("❌ Failed to create user")
    });
  };

  const handleEdit = () => {
    if (!showEdit) return;
    updateUser.mutate(
      { id: showEdit.id, payload: { email: form.email, username: form.username, role: form.role } },
      {
        onSuccess: () => {
          setShowEdit(null);
          showToast("✅ User updated successfully");
        },
        onError: () => showToast("❌ Failed to update user")
      }
    );
  };

  const handleToggle = () => {
    if (!showConfirm) return;
    updateUser.mutate(
      { id: showConfirm.id, payload: { isActive: !showConfirm.isActive } },
      {
        onSuccess: () => {
          showToast(showConfirm.isActive ? "⚠️ User suspended" : "✅ User activated");
          setShowConfirm(null);
        },
        onError: () => showToast("❌ Failed to change status")
      }
    );
  };

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Users" subtitle="All users across all schools on the platform" />
      <main className="flex-1 p-6 space-y-5">

        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Total Users", value: users.length, color: "text-gray-900" },
            { label: "School Admins", value: users.filter((u: PlatformUser) => u.role === "SCHOOL_ADMIN").length, color: "text-indigo-600" },
            { label: "Accountants", value: users.filter((u: PlatformUser) => u.role === "ACCOUNTANT").length, color: "text-green-600" },
            { label: "Teachers", value: users.filter((u: PlatformUser) => u.role === "TEACHER").length, color: "text-orange-600" },
            { label: "Suspended", value: users.filter((u: PlatformUser) => !u.isActive).length, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-5">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email or username..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="flex gap-2">
            {["all", "SCHOOL_ADMIN", "ACCOUNTANT", "TEACHER", "PARENT"].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${roleFilter === r ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {r === "all" ? "All" : roleLabel[r] ?? r}
              </button>
            ))}
          </div>
          <Button onClick={() => { setForm({ email: "", username: "", password: "", role: "SCHOOL_ADMIN", schoolId: "" }); setShowAdd(true); }}>
            <Plus className="w-4 h-4" />Add User
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Platform Users ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["User", "Role", "School ID", "Status", "Last Login", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No users found</td></tr>}
                {filtered.map((u: PlatformUser) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-purple-50/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-purple-600" /></div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.username}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${roleColors[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {roleLabel[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{u.schoolId?.slice(-8) ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? "success" : "danger"}>{u.isActive ? "Active" : "Suspended"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setForm({ email: u.email, username: u.username, role: u.role }); setShowEdit(u); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
                        {u.isActive
                          ? <button onClick={() => setShowConfirm(u)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Lock className="w-4 h-4" /></button>
                          : <button onClick={() => setShowConfirm(u)} className="p-1.5 text-gray-400 hover:text-green-600 rounded"><Unlock className="w-4 h-4" /></button>
                        }
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Modals */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[480px] p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Add Platform User</h3>
                <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <input placeholder="Email" value={form.email || ""} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                <input placeholder="Username" value={form.username || ""} onChange={e => setForm((f: any) => ({ ...f, username: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                <input placeholder="Password" type="password" value={form.password || ""} onChange={e => setForm((f: any) => ({ ...f, password: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                <select value={form.role || "SCHOOL_ADMIN"} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white">
                  {Object.keys(roleLabel).map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
                </select>
                <input placeholder="School ID (Optional)" value={form.schoolId || ""} onChange={e => setForm((f: any) => ({ ...f, schoolId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Create User</Button>
              </div>
            </Card>
          </div>
        )}

        {showEdit && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[480px] p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Edit User — {showEdit.username}</h3>
                <button onClick={() => setShowEdit(null)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <input placeholder="Email" value={form.email || ""} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                <input placeholder="Username" value={form.username || ""} onChange={e => setForm((f: any) => ({ ...f, username: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                <select value={form.role || ""} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white">
                  {Object.keys(roleLabel).map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
                <Button onClick={handleEdit}>Save Changes</Button>
              </div>
            </Card>
          </div>
        )}

        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[400px] p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${showConfirm.isActive ? "bg-red-100" : "bg-green-100"}`}>
                  <AlertTriangle className={`w-5 h-5 ${showConfirm.isActive ? "text-red-500" : "text-green-600"}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{showConfirm.isActive ? "Suspend User?" : "Activate User?"}</h3>
                  <p className="text-sm text-gray-500 mt-1">{showConfirm.isActive ? `User ${showConfirm.username} will immediately lose access.` : `User ${showConfirm.username} will regain access.`}</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowConfirm(null)}>Cancel</Button>
                <Button onClick={handleToggle} className={showConfirm.isActive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}>
                  {showConfirm.isActive ? "Yes, Suspend" : "Yes, Activate"}
                </Button>
              </div>
            </Card>
          </div>
        )}

      </main>
    </div>
  );
}
