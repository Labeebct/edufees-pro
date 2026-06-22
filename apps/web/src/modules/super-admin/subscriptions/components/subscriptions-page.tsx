"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/modules/shared/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card";
import { Button } from "@/modules/shared/ui/button";
import { Badge } from "@/modules/shared/ui/badge";
import { useSubscriptions } from "@/lib/api/hooks/useDomains";
import { useUpdateSubscription } from "@/lib/api/hooks/useSuperAdmin";
import { CheckCircle, TrendingUp, X, AlertTriangle, Plus, Edit2, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

type Sub = { id: string; schoolId: string; school: string; plan: string; mrr: number; status: string; renewal: string; seats: number };
type Plan = { id: number; name: string; price: number; maxStudents: number; features: string[]; color: string };

const planColorMap: Record<string, string> = {
  Free: "bg-gray-100 text-gray-600", Starter: "bg-blue-100 text-blue-700",
  Growth: "bg-indigo-100 text-indigo-700", Enterprise: "bg-purple-100 text-purple-700",
};

const DEFAULT_PLANS: Plan[] = [
  { id: 1, name: "Free", price: 0, maxStudents: 50, features: ["Basic fee tracking", "Email support", "1 Admin user"], color: "#9ca3af" },
  { id: 2, name: "Starter", price: 1999, maxStudents: 300, features: ["WhatsApp alerts", "Basic reports", "3 Staff users", "Email + Chat support"], color: "#3b82f6" },
  { id: 3, name: "Growth", price: 4999, maxStudents: 1000, features: ["All features", "Call logging", "Bulk import", "Priority support", "10 Staff users"], color: "#6366f1" },
  { id: 4, name: "Enterprise", price: 0, maxStudents: 999999, features: ["Unlimited students", "Custom branding", "Dedicated manager", "SLA guarantee", "API access"], color: "#7c3aed" },
];

const titleCase = (v: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v);

const revenueData = [
  { month: "Jan", revenue: 185000 }, { month: "Feb", revenue: 210000 }, { month: "Mar", revenue: 195000 },
  { month: "Apr", revenue: 240000 }, { month: "May", revenue: 268000 }, { month: "Jun", revenue: 295000 },
];

export function SubscriptionsPage() {
  const subsQuery = useSubscriptions();
  const updateSubscription = useUpdateSubscription();
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (subsQuery.data && subsQuery.data.length > 0) {
      setSubs(
        subsQuery.data.map(s => {
          const plan = titleCase(s.plan);
          return {
            id: s.id,
            schoolId: s.schoolId,
            school: s.school?.name ?? "—",
            plan,
            mrr: DEFAULT_PLANS.find(p => p.name === plan)?.price ?? 0,
            status: titleCase(s.status),
            renewal: s.endDate ? s.endDate.slice(0, 10) : "—",
            seats: 0,
          };
        }),
      );
    }
  }, [subsQuery.data]);

  // Modals
  const [changePlan, setChangePlan] = useState<Sub | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [confirmSub, setConfirmSub] = useState<Sub | null>(null);
  const [showAddSub, setShowAddSub] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [confirmDeletePlan, setConfirmDeletePlan] = useState<Plan | null>(null);

  // Add Subscription form
  const [subForm, setSubForm] = useState({ school: "", plan: "Starter", seats: "", renewal: "" });

  // Plan form
  const [planForm, setPlanForm] = useState({ name: "", price: "", maxStudents: "", features: "", color: "#6366f1" });

  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const mrr = subs.filter(s => s.status === "Active").reduce((a, s) => a + s.mrr, 0);
  const planDist = plans.map(p => ({ name: p.name, value: subs.filter(s => s.plan === p.name).length, fill: p.color }));
  const getPlanMRR = (name: string) => plans.find(p => p.name === name)?.price || 0;

  const planToApi = (name: string) => name.toUpperCase();

  const handleChangePlan = () => {
    if (!changePlan) return;
    updateSubscription.mutate(
      { schoolId: changePlan.schoolId, payload: { plan: planToApi(selectedPlan) } },
      {
        onSuccess: () => {
          showToast(`✅ ${changePlan.school} moved to ${selectedPlan} plan`);
          setChangePlan(null);
        },
        onError: () => showToast("❌ Failed to update subscription plan"),
      },
    );
  };

  const handleToggleStatus = () => {
    if (!confirmSub) return;
    const nextStatus = confirmSub.status === "Active" ? "SUSPENDED" : "ACTIVE";
    updateSubscription.mutate(
      { schoolId: confirmSub.schoolId, payload: { status: nextStatus } },
      {
        onSuccess: () => {
          showToast(confirmSub.status === "Active" ? "⚠️ Subscription suspended" : "✅ Subscription activated");
          setConfirmSub(null);
        },
        onError: () => showToast("❌ Failed to update subscription status"),
      },
    );
  };

  const handleAddSub = () => {
    if (!subForm.school || !subForm.plan) { showToast("⚠️ School name and plan are required"); return; }
    setSubs(prev => [...prev, {
      id: String(Date.now()), schoolId: "", school: subForm.school, plan: subForm.plan,
      mrr: getPlanMRR(subForm.plan), status: "Active",
      renewal: subForm.renewal || "—", seats: parseInt(subForm.seats) || 0,
    }]);
    showToast(`✅ Subscription added for ${subForm.school}`);
    setShowAddSub(false);
    setSubForm({ school: "", plan: "Starter", seats: "", renewal: "" });
  };

  const openAddPlan = () => {
    setEditPlan(null);
    setPlanForm({ name: "", price: "", maxStudents: "", features: "", color: "#6366f1" });
    setShowPlanModal(true);
  };
  const openEditPlan = (p: Plan) => {
    setEditPlan(p);
    setPlanForm({ name: p.name, price: String(p.price), maxStudents: String(p.maxStudents), features: p.features.join(", "), color: p.color });
    setShowPlanModal(true);
  };
  const savePlan = () => {
    if (!planForm.name || !planForm.maxStudents) { showToast("⚠️ Plan name and student limit are required"); return; }
    const featList = planForm.features.split(",").map(f => f.trim()).filter(Boolean);
    if (editPlan) {
      setPlans(prev => prev.map(p => p.id === editPlan.id ? { ...p, name: planForm.name, price: +planForm.price || 0, maxStudents: +planForm.maxStudents, features: featList, color: planForm.color } : p));
      showToast("✅ Plan updated");
    } else {
      setPlans(prev => [...prev, { id: Date.now(), name: planForm.name, price: +planForm.price || 0, maxStudents: +planForm.maxStudents, features: featList, color: planForm.color }]);
      showToast(`✅ "${planForm.name}" plan created`);
    }
    setShowPlanModal(false);
  };
  const deletePlan = () => {
    setPlans(prev => prev.filter(p => p.id !== confirmDeletePlan!.id));
    showToast(`🗑️ "${confirmDeletePlan!.name}" plan removed`);
    setConfirmDeletePlan(null);
  };

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Subscriptions" subtitle="Plan management and revenue overview" />
      <main className="flex-1 p-6 space-y-5">

        {toast && <div className="fixed top-5 right-5 z-[999] bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl">{toast}</div>}

        {/* MRR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-5 bg-purple-600 text-white col-span-2">
            <p className="text-purple-200 text-xs font-medium uppercase">Monthly Recurring Revenue</p>
            <p className="text-3xl font-bold mt-1">₹{mrr.toLocaleString()}</p>
            <p className="text-purple-200 text-xs mt-1 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />+12% vs last month</p>
          </Card>
          <Card className="p-5">
            <p className="text-gray-400 text-xs">Paying Institutes</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{subs.filter(s => s.plan !== "Free" && s.status === "Active").length}</p>
            <p className="text-xs text-gray-500">{subs.filter(s => s.plan === "Free").length} on free plan</p>
          </Card>
          <Card className="p-5">
            <p className="text-gray-400 text-xs">ARR (Projected)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹{(mrr * 12).toLocaleString()}</p>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {["Plans", "Subscriptions", "Analytics"].map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === i ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-900"}`}>{t}</button>
          ))}
        </div>

        {/* ── TAB 0: PLANS ── */}
        {tab === 0 && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => showToast("⚠️ Plans are managed via system configuration.")}><Plus className="w-4 h-4" />Create New Plan</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map(p => (
                <Card key={p.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-bold text-gray-900 text-base">{p.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColorMap[p.name] || "bg-gray-100 text-gray-600"}`}>
                        {p.price ? `₹${p.price.toLocaleString()}/mo` : p.name === "Enterprise" ? "Custom" : "Free"}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => showToast("⚠️ Plans are managed via system configuration.")} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => showToast("⚠️ Plans are managed via system configuration.")} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Up to <strong>{p.maxStudents >= 999999 ? "Unlimited" : p.maxStudents.toLocaleString()}</strong> students · <strong>{subs.filter(s => s.plan === p.name).length}</strong> institutes on this plan</p>
                  <ul className="space-y-1.5">
                    {p.features.map(f => (
                      <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                </Card>
              ))}
              {/* Add plan card */}
              <button onClick={() => showToast("⚠️ Plans are managed via system configuration.")} className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:border-purple-400 hover:bg-purple-50 transition-colors">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center"><Plus className="w-5 h-5 text-gray-400" /></div>
                <p className="text-sm text-gray-500 font-medium">Create New Plan</p>
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 1: SUBSCRIPTIONS ── */}
        {tab === 1 && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => showToast("⚠️ Subscriptions are automatically managed via Institute onboarding.")}><Plus className="w-4 h-4" />Add Subscription</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {["Institute", "Plan", "MRR", "Seats", "Renewal", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subs.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{s.school}</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-md font-medium ${planColorMap[s.plan] || "bg-gray-100 text-gray-600"}`}>{s.plan}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-700">{s.mrr ? `₹${s.mrr.toLocaleString()}` : "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.seats.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.renewal !== "—" ? new Date(s.renewal).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-4 py-3">
                          {s.status === "Active" ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Suspended</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => { setChangePlan(s); setSelectedPlan(s.plan); }} className="text-xs text-purple-600 hover:underline font-medium">Change Plan</button>
                            {s.status === "Active"
                              ? <button onClick={() => setConfirmSub(s)} className="text-xs text-red-500 hover:underline font-medium">Suspend</button>
                              : <button onClick={() => setConfirmSub(s)} className="text-xs text-green-600 hover:underline font-medium">Activate</button>
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TAB 2: ANALYTICS ── */}
        {tab === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="col-span-2">
              <CardHeader><CardTitle>Revenue Trend (MRR)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => [`₹${Number(v).toLocaleString()}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Institutes by Plan</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={planDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      {planDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── CREATE/EDIT PLAN MODAL ── */}
        {showPlanModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[520px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">{editPlan ? "Edit Plan" : "Create New Plan"}</h3>
                <button onClick={() => setShowPlanModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Plan Name *</label>
                  <input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. Professional" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Monthly Price (₹)</label>
                  <input type="number" value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="0 for free / custom" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Max Students *</label>
                  <input type="number" value={planForm.maxStudents} onChange={e => setPlanForm(f => ({ ...f, maxStudents: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. 500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Badge Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={planForm.color} onChange={e => setPlanForm(f => ({ ...f, color: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                    <span className="text-xs text-gray-500">{planForm.color}</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 font-medium">Features (comma separated)</label>
                  <textarea value={planForm.features} onChange={e => setPlanForm(f => ({ ...f, features: e.target.value }))} rows={3}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="e.g. 500 students, WhatsApp alerts, Priority support" />
                </div>
              </div>
              {/* Preview */}
              {planForm.name && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-2">Preview</p>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: planForm.color }} />
                    <span className="font-bold text-gray-900">{planForm.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: planForm.color }}>
                      {planForm.price ? `₹${Number(planForm.price).toLocaleString()}/mo` : "Free"}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => setShowPlanModal(false)}>Cancel</Button>
                <Button onClick={savePlan}>{editPlan ? "Save Changes" : "Create Plan"}</Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── ADD SUBSCRIPTION MODAL ── */}
        {showAddSub && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[460px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Add New Subscription</h3>
                <button onClick={() => setShowAddSub(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Institute Name *</label>
                  <input value={subForm.school} onChange={e => setSubForm(f => ({ ...f, school: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. Ryan International" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Select Plan *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {plans.map(p => (
                      <button key={p.name} onClick={() => setSubForm(f => ({ ...f, plan: p.name }))}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${subForm.plan === p.name ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-300"}`}>
                        <div className="flex justify-between">
                          <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                          <span className="text-xs font-bold text-purple-600">{p.price ? `₹${p.price.toLocaleString()}` : p.name === "Enterprise" ? "Custom" : "Free"}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Up to {p.maxStudents >= 999999 ? "∞" : p.maxStudents.toLocaleString()} students</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">No. of Seats</label>
                    <input type="number" value={subForm.seats} onChange={e => setSubForm(f => ({ ...f, seats: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Students count" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Renewal Date</label>
                    <input type="date" value={subForm.renewal} onChange={e => setSubForm(f => ({ ...f, renewal: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>
                {subForm.plan && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm">
                    <span className="text-gray-600">MRR for this subscription: </span>
                    <span className="font-bold text-purple-700">₹{getPlanMRR(subForm.plan).toLocaleString()}/mo</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => setShowAddSub(false)}>Cancel</Button>
                <Button onClick={handleAddSub}>Add Subscription</Button>
              </div>
            </Card>
          </div>
        )}

        {/* Change Plan Modal */}
        {changePlan && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[520px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Change Plan — {changePlan.school}</h3>
                <button onClick={() => setChangePlan(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
              </div>
              <p className="text-sm text-gray-500">Current: <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${planColorMap[changePlan.plan] || "bg-gray-100 text-gray-600"}`}>{changePlan.plan}</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plans.map(p => (
                  <button key={p.name} onClick={() => setSelectedPlan(p.name)}
                    className={`text-left border-2 rounded-xl p-3 transition-all ${selectedPlan === p.name ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-300"}`}>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900">{p.name}</span>
                      <span className="text-xs font-bold text-purple-600">{p.price ? `₹${p.price.toLocaleString()}` : p.name === "Enterprise" ? "Custom" : "Free"}</span>
                    </div>
                    <p className="text-xs text-gray-400">Up to {p.maxStudents >= 999999 ? "unlimited" : p.maxStudents.toLocaleString()} students</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => setChangePlan(null)}>Cancel</Button>
                <Button onClick={handleChangePlan} disabled={selectedPlan === changePlan.plan}>Confirm Change</Button>
              </div>
            </Card>
          </div>
        )}

        {/* Confirm Suspend/Activate */}
        {confirmSub && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[380px] p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${confirmSub.status === "Active" ? "bg-red-100" : "bg-green-100"}`}>
                  <AlertTriangle className={`w-5 h-5 ${confirmSub.status === "Active" ? "text-red-500" : "text-green-600"}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{confirmSub.status === "Active" ? "Suspend?" : "Activate?"}</h3>
                  <p className="text-sm text-gray-500 mt-1">{confirmSub.school} — {confirmSub.status === "Active" ? "will lose access immediately" : "will regain full access"}</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirmSub(null)}>Cancel</Button>
                <Button onClick={handleToggleStatus} className={confirmSub.status === "Active" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}>
                  {confirmSub.status === "Active" ? "Yes, Suspend" : "Yes, Activate"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Confirm Delete Plan */}
        {confirmDeletePlan && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[380px] p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Delete "{confirmDeletePlan.name}" Plan?</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {subs.filter(s => s.plan === confirmDeletePlan.name).length > 0
                      ? `⚠️ ${subs.filter(s => s.plan === confirmDeletePlan.name).length} institute(s) are on this plan. Move them first.`
                      : "This plan has no active subscribers and can be safely deleted."}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirmDeletePlan(null)}>Cancel</Button>
                <Button onClick={deletePlan} disabled={subs.filter(s => s.plan === confirmDeletePlan.name).length > 0}
                  className="bg-red-600 hover:bg-red-700 text-white">Delete Plan</Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
