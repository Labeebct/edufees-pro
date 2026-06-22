"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/modules/shared/layout/topbar";
import { Card, CardContent } from "@/modules/shared/ui/card";
import { Button } from "@/modules/shared/ui/button";
import { Badge } from "@/modules/shared/ui/badge";
import { useSchools, type SchoolListItem } from "@/lib/api/hooks/useDomains";
import { useOnboardSchool, useUpdateSchool, useUpdateSubscription } from "@/lib/api/hooks/useSuperAdmin";
import {
  Plus, Search, Building2, CheckCircle, XCircle, Eye, Edit2,
  ChevronRight, X, AlertTriangle
} from "lucide-react";

type School = {
  id: string; name: string; city: string; state: string;
  plan: string; students: number; staff: number; status: string;
  joined: string; adminEmail: string; adminName: string; phone: string;
};

function apiToSchool(s: SchoolListItem): School {
  return {
    id: s.id,
    name: s.name,
    city: s.city ?? "—",
    state: s.state ?? "",
    plan: s.plan ?? "Free",
    students: s.studentCount,
    staff: s.userCount,
    status: s.isActive ? "ACTIVE" : "SUSPENDED",
    joined: s.createdAt ? s.createdAt.slice(0, 10) : "",
    adminEmail: s.adminEmail ?? "",
    adminName: "",
    phone: s.phone ?? "",
  };
}

const planColors: Record<string, string> = {
  Free: "bg-gray-100 text-gray-600",
  Starter: "bg-blue-100 text-blue-700",
  Growth: "bg-indigo-100 text-indigo-700",
  Enterprise: "bg-purple-100 text-purple-700",
};

const PLANS = ["Free", "Starter", "Growth", "Enterprise"];
const WIZARD_STEPS = ["Institute Info", "Admin User", "Select Plan", "Confirm"];

const emptyForm = { name: "", city: "", state: "", address: "", phone: "", adminName: "", adminEmail: "", adminMobile: "", plan: "Starter" };

export function SchoolsPage() {
  const router = useRouter();
  const schoolsQuery = useSchools({ pageSize: 100 });
  const onboardSchool = useOnboardSchool();
  const updateSchool = useUpdateSchool();
  const updateSubscription = useUpdateSubscription();
  const [schools, setSchools] = useState<School[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (schoolsQuery.data?.data && schoolsQuery.data.data.length > 0) {
      setSchools(schoolsQuery.data.data.map(apiToSchool));
    }
  }, [schoolsQuery.data]);

  // Wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState({ ...emptyForm });

  // Edit modal
  const [editSchool, setEditSchool] = useState<School | null>(null);
  const [editForm, setEditForm] = useState<Partial<School>>({});

  // Confirm dialog
  const [confirmSchool, setConfirmSchool] = useState<School | null>(null);
  const [confirmAction, setConfirmAction] = useState<"suspend" | "activate">("suspend");

  // Toast
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const filtered = schools.filter(s =>
    (statusFilter === "all" || s.status === statusFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase()))
  );

  // Onboard school
  const handleOnboard = () => {
    if (!form.name.trim() || !form.adminEmail.trim()) {
      showToast("⚠️ Institute name and admin email are required");
      return;
    }
    const slug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    onboardSchool.mutate(
      {
        name: form.name.trim(),
        slug,
        city: form.city || undefined,
        state: form.state || undefined,
        addressLine1: form.address || undefined,
        primaryEmail: form.adminEmail.trim(),
        primaryPhone: form.phone || form.adminMobile || "0000000000",
        adminEmail: form.adminEmail.trim(),
        adminPassword: "Welcome@123",
        plan: form.plan.toUpperCase(),
      },
      {
        onSuccess: () => {
          setShowWizard(false);
          setWizardStep(0);
          setForm({ ...emptyForm });
          showToast(`✅ ${form.name} onboarded successfully! Credentials sent to ${form.adminEmail}`);
        },
        onError: () => showToast("❌ Failed to onboard institute"),
      },
    );
  };

  const handleEditSave = () => {
    if (!editSchool) return;
    const isPlanChanged = editForm.plan && editForm.plan !== editSchool.plan;

    updateSchool.mutate(
      {
        id: editSchool.id,
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
              schoolId: editSchool.id,
              payload: { plan: editForm.plan.toUpperCase() }
            });
          }
          setEditSchool(null);
          showToast("✅ Institute details updated successfully");
        },
        onError: () => showToast("❌ Failed to update institute details"),
      }
    );
  };

  // Suspend / Activate
  const handleStatusChange = () => {
    if (!confirmSchool) return;
    const activating = confirmAction === "activate";
    updateSchool.mutate(
      { id: confirmSchool.id, payload: { isActive: activating } },
      {
        onSuccess: () => {
          setSchools(prev => prev.map(s => s.id === confirmSchool.id ? { ...s, status: activating ? "ACTIVE" : "SUSPENDED" } : s));
          showToast(activating ? `✅ ${confirmSchool.name} activated` : `⚠️ ${confirmSchool.name} suspended`);
          setConfirmSchool(null);
        },
        onError: () => showToast("❌ Failed to update institute status"),
      },
    );
  };

  const upd = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Institutes" subtitle="Manage all onboarded institutes" />
      <main className="flex-1 p-6 space-y-5">

        {/* Toast */}
        {toast && (
          <div className="fixed top-5 right-5 z-[999] bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl animate-in fade-in">
            {toast}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Institutes", value: schools.length, color: "text-gray-900" },
            { label: "Active", value: schools.filter(s => s.status === "ACTIVE").length, color: "text-green-600" },
            { label: "Suspended", value: schools.filter(s => s.status === "SUSPENDED").length, color: "text-red-600" },
            { label: "Total Students", value: schools.reduce((a, s) => a + s.students, 0).toLocaleString(), color: "text-purple-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-5">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </Card>
          ))}
        </div>

        {/* Search + Filter + Add */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search institutes by name or city..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="flex gap-2">
            {[["all", "All"], ["ACTIVE", "Active"], ["SUSPENDED", "Suspended"]].map(([val, label]) => (
              <button key={val} onClick={() => setStatusFilter(val)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === val ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{label}</button>
            ))}
          </div>
          <Button onClick={() => { setShowWizard(true); setWizardStep(0); setForm({ ...emptyForm }); }}>
            <Plus className="w-4 h-4" />Onboard School
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Institute", "Location", "Plan", "Students", "Staff", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-purple-50/30 cursor-pointer" onClick={() => router.push(`/super-admin/schools/${s.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><Building2 className="w-4 h-4 text-purple-600" /></div>
                        <div>
                          <p className="text-sm font-semibold text-purple-700">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.adminEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.city}, {s.state}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-md font-medium ${planColors[s.plan]}`}>{s.plan}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{s.students.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{s.staff}</td>
                    <td className="px-4 py-3">
                      {s.status === "ACTIVE" ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Suspended</Badge>}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => router.push(`/super-admin/schools/${s.id}`)} className="p-1.5 text-gray-400 hover:text-purple-600 rounded" title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => { setEditSchool(s); setEditForm({ name: s.name, city: s.city, state: s.state, plan: s.plan, phone: s.phone, adminEmail: s.adminEmail }); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        {s.status === "ACTIVE"
                          ? <button onClick={() => { setConfirmSchool(s); setConfirmAction("suspend"); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="Suspend"><XCircle className="w-4 h-4" /></button>
                          : <button onClick={() => { setConfirmSchool(s); setConfirmAction("activate"); }} className="p-1.5 text-gray-400 hover:text-green-600 rounded" title="Activate"><CheckCircle className="w-4 h-4" /></button>
                        }
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No schools found</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ── ONBOARD WIZARD ── */}
        {showWizard && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[580px] p-6 space-y-5">
              {/* Progress */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-gray-900 text-lg">Onboard New Institute</h3>
                <button onClick={() => setShowWizard(false)} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-0">
                {WIZARD_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${i < wizardStep ? "bg-purple-600 border-purple-600 text-white" : i === wizardStep ? "border-purple-600 text-purple-600 bg-white" : "border-gray-300 text-gray-400"}`}>
                        {i < wizardStep ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      <p className={`text-xs mt-1 font-medium ${i === wizardStep ? "text-purple-600" : i < wizardStep ? "text-green-600" : "text-gray-400"}`}>{step}</p>
                    </div>
                    {i < WIZARD_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < wizardStep ? "bg-purple-600" : "bg-gray-200"}`} />}
                  </div>
                ))}
              </div>

              {/* Step 0 – School Info */}
              {wizardStep === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-medium">Institute Name *</label>
                    <input value={form.name} onChange={e => upd("name", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. Greenfield Academy" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">City *</label>
                    <input value={form.city} onChange={e => upd("city", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="City" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">State *</label>
                    <input value={form.state} onChange={e => upd("state", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="State" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-medium">Full Address</label>
                    <input value={form.address} onChange={e => upd("address", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Street, locality, PIN" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-medium">Phone</label>
                    <input value={form.phone} onChange={e => upd("phone", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Institute phone number" />
                  </div>
                </div>
              )}

              {/* Step 1 – Admin User */}
              {wizardStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Admin Full Name *</label>
                    <input value={form.adminName} onChange={e => upd("adminName", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Principal / Admin name" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Admin Email *</label>
                    <input type="email" value={form.adminEmail} onChange={e => upd("adminEmail", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="admin@school.edu" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Admin Mobile *</label>
                    <input type="tel" value={form.adminMobile} onChange={e => upd("adminMobile", e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="10-digit mobile" />
                  </div>
                  <p className="text-xs text-gray-400 bg-blue-50 px-3 py-2 rounded-lg">A temporary password will be auto-generated and sent to the admin email and mobile.</p>
                </div>
              )}

              {/* Step 2 – Plan */}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Select a subscription plan for this institute:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { plan: "Free", price: "₹0/mo", features: ["Up to 50 students", "Basic fee tracking", "No WhatsApp"] },
                      { plan: "Starter", price: "₹1,999/mo", features: ["Up to 300 students", "WhatsApp alerts", "Basic reports"] },
                      { plan: "Growth", price: "₹4,999/mo", features: ["Up to 1,000 students", "All features", "Priority support"] },
                      { plan: "Enterprise", price: "Custom", features: ["Unlimited students", "Dedicated support", "Custom branding"] },
                    ].map(({ plan, price, features }) => (
                      <button key={plan} onClick={() => upd("plan", plan)} className={`text-left border-2 rounded-xl p-4 transition-all ${form.plan === plan ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-300"}`}>
                        <div className="flex justify-between mb-2">
                          <span className="font-semibold text-gray-900">{plan}</span>
                          <span className="text-sm font-bold text-purple-600">{price}</span>
                        </div>
                        <ul className="space-y-0.5">
                          {features.map(f => <li key={f} className="text-xs text-gray-500 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 shrink-0" />{f}</li>)}
                        </ul>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3 – Confirm */}
              {wizardStep === 3 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 font-medium">Review and confirm:</p>
                  <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                    {[
                      ["Institute Name", form.name || "—"],
                      ["Location", `${form.city}${form.state ? ", " + form.state : ""}`],
                      ["Admin Name", form.adminName || "—"],
                      ["Admin Email", form.adminEmail || "—"],
                      ["Admin Mobile", form.adminMobile || "—"],
                      ["Plan", form.plan],
                      ["Status", "Active on creation"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-gray-500">{k}</span>
                        <span className="font-medium text-gray-900">{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Login credentials will be sent to the admin email and mobile. The school will be immediately active.</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => wizardStep === 0 ? setShowWizard(false) : setWizardStep(w => w - 1)}>
                  {wizardStep === 0 ? "Cancel" : "← Back"}
                </Button>
                <Button onClick={() => wizardStep < 3 ? setWizardStep(w => w + 1) : handleOnboard()}
                  disabled={wizardStep === 0 && !form.name}>
                  {wizardStep < 3 ? "Next →" : "✓ Create Institute"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── EDIT MODAL ── */}
        {editSchool && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[480px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Edit Institute — {editSchool.name}</h3>
                <button onClick={() => setEditSchool(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ["Institute Name", "name", "text"],
                  ["City", "city", "text"],
                  ["State", "state", "text"],
                  ["Phone", "phone", "text"],
                  ["Admin Email", "adminEmail", "email"],
                ].map(([label, key, type]) => (
                  <div key={key} className={key === "name" || key === "adminEmail" ? "col-span-2" : ""}>
                    <label className="text-xs text-gray-500 font-medium">{label}</label>
                    <input type={type} value={(editForm as any)[key] || ""} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 font-medium">Plan</label>
                  <select value={(editForm as any).plan || editSchool.plan} onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                    {PLANS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => setEditSchool(null)}>Cancel</Button>
                <Button onClick={handleEditSave}>Save Changes</Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── CONFIRM SUSPEND/ACTIVATE ── */}
        {confirmSchool && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[400px] p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${confirmAction === "suspend" ? "bg-red-100" : "bg-green-100"}`}>
                  <AlertTriangle className={`w-5 h-5 ${confirmAction === "suspend" ? "text-red-500" : "text-green-600"}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {confirmAction === "suspend" ? "Suspend Institute?" : "Activate Institute?"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {confirmAction === "suspend"
                      ? `This will suspend institute ${confirmSchool.name}. All users will lose access immediately.`
                      : `This will reactivate institute ${confirmSchool.name}. All users will regain access.`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirmSchool(null)}>Cancel</Button>
                <Button
                  onClick={handleStatusChange}
                  className={confirmAction === "suspend" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}>
                  {confirmAction === "suspend" ? "Yes, Suspend" : "Yes, Activate"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
