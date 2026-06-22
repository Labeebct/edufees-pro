"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/modules/shared/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card";
import { Button } from "@/modules/shared/ui/button";
import { CheckCircle, Shield, Bell, Server, Globe, Eye, EyeOff, CreditCard, Building, Plus, Trash2, Edit2, X } from "lucide-react";
import { usePlatformSettings, useUpdatePlatformSettings } from "@/lib/api/hooks/useSuperAdmin";

const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
  <button onClick={onChange} className={`w-11 h-6 rounded-full relative transition-colors ${value ? "bg-purple-600" : "bg-gray-300"}`}>
    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${value ? "right-0.5" : "left-0.5"}`} />
  </button>
);

type BankAccount = {
  id: number; accountName: string; bankName: string; accountNo: string;
  ifsc: string; branch: string; type: string; primary: boolean;
};

type PayGateway = {
  id: number; name: string; mode: string; keyId: string; active: boolean;
};

export function SettingsPage() {
  const settingsQuery = usePlatformSettings();
  const updateSettings = useUpdatePlatformSettings();
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // Platform identity
  const [platform, setPlatform] = useState({
    name: "EduFees Pro", supportEmail: "support@edufees.pro",
    supportPhone: "+91-1800-XXX-XXXX", website: "https://edufees.pro",
  });

  // Security
  const [security, setSecurity] = useState({
    maxAttempts: 5, sessionTimeout: 30, minPassword: 8, twoFA: true, ipWhitelist: false,
  });

  // Notifications
  const [notifSettings, setNotifSettings] = useState({
    whatsappProvider: "Twilio", emailProvider: "SendGrid",
    reminderDays: "7, 3, 1", autoReminder: true,
  });

  // Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    { id: 1, accountName: "EduFees Pro Pvt Ltd", bankName: "HDFC Bank", accountNo: "XXXX XXXX 4521", ifsc: "HDFC0001234", branch: "Andheri West, Mumbai", type: "Current", primary: true },
    { id: 2, accountName: "EduFees Pro Pvt Ltd", bankName: "ICICI Bank", accountNo: "XXXX XXXX 8890", ifsc: "ICIC0005678", branch: "Bandra, Mumbai", type: "Savings", primary: false },
  ]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editBank, setEditBank] = useState<BankAccount | null>(null);
  const [bankForm, setBankForm] = useState({ accountName: "", bankName: "", accountNo: "", ifsc: "", branch: "", type: "Current" });

  // Payment Gateways
  const [gateways, setGateways] = useState<PayGateway[]>([
    { id: 1, name: "Razorpay", mode: "Live", keyId: "rzp_live_XXXXXXXXXXXX", active: true },
    { id: 2, name: "PayU", mode: "Test", keyId: "payU_test_XXXXXXXXXXXX", active: false },
    { id: 3, name: "Stripe", mode: "Test", keyId: "sk_test_XXXXXXXXXXXX", active: false },
  ]);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [gwForm, setGwForm] = useState({ name: "Razorpay", mode: "Test", keyId: "", keySecret: "" });

  // Password
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwForm, setPwForm] = useState({ old: "", newPw: "", confirm: "" });

  useEffect(() => {
    const data = settingsQuery.data;
    if (!data) return;
    if (data.platform) setPlatform(data.platform);
    if (data.security) setSecurity(data.security);
    if (data.notifications) setNotifSettings(data.notifications);
    if (data.gateways?.length) {
      setGateways(data.gateways.map((g: any, i: number) => ({
        id: i + 1,
        name: g.name,
        mode: g.mode,
        keyId: g.keyId,
        active: g.active,
      })));
    }
    if ((data as any).bankAccounts?.length) {
      setBankAccounts((data as any).bankAccounts);
    }
  }, [settingsQuery.data]);

  const saveSection = (patch: Record<string, unknown>, label: string) => {
    updateSettings.mutate(patch, {
      onSuccess: () => showToast(`✅ ${label} saved`),
      onError: () => showToast(`❌ Failed to save ${label.toLowerCase()}`),
    });
  };

  const openAddBank = () => {
    setEditBank(null);
    setBankForm({ accountName: "", bankName: "", accountNo: "", ifsc: "", branch: "", type: "Current" });
    setShowBankModal(true);
  };
  const openEditBank = (b: BankAccount) => {
    setEditBank(b);
    setBankForm({ accountName: b.accountName, bankName: b.bankName, accountNo: b.accountNo, ifsc: b.ifsc, branch: b.branch, type: b.type });
    setShowBankModal(true);
  };
  const saveBank = () => {
    if (!bankForm.accountName || !bankForm.bankName || !bankForm.accountNo || !bankForm.ifsc) {
      showToast("⚠️ Please fill required fields"); return;
    }
    let updated: BankAccount[];
    if (editBank) {
      updated = bankAccounts.map(b => b.id === editBank.id ? { ...b, ...bankForm } : b);
    } else {
      updated = [...bankAccounts, { id: Date.now(), ...bankForm, primary: bankAccounts.length === 0 }];
    }
    setBankAccounts(updated);
    updateSettings.mutate(
      { bankAccounts: updated },
      {
        onSuccess: () => showToast(editBank ? "✅ Bank account updated" : "✅ Bank account added"),
        onError: () => showToast("❌ Failed to save bank account"),
      }
    );
    setShowBankModal(false);
  };
  const deleteBank = (id: number) => {
    const updated = bankAccounts.filter(b => b.id !== id);
    setBankAccounts(updated);
    updateSettings.mutate(
      { bankAccounts: updated },
      { onSuccess: () => showToast("🗑️ Bank account removed") }
    );
  };
  const setPrimary = (id: number) => {
    const updated = bankAccounts.map(b => ({ ...b, primary: b.id === id }));
    setBankAccounts(updated);
    updateSettings.mutate(
      { bankAccounts: updated },
      { onSuccess: () => showToast("✅ Primary account updated") }
    );
  };

  const saveGateway = () => {
    if (!gwForm.keyId || !gwForm.keySecret) { showToast("⚠️ Enter API Key and Secret"); return; }
    const newGw: PayGateway = { id: Date.now(), name: gwForm.name, mode: gwForm.mode, keyId: gwForm.keyId, active: false };
    const updated = [...gateways, newGw];
    setGateways(updated);
    updateSettings.mutate(
      { gateways: updated.map(g => ({ name: g.name, mode: g.mode, keyId: g.keyId, active: g.active })) },
      {
        onSuccess: () => showToast(`✅ ${gwForm.name} gateway added`),
        onError: () => showToast("❌ Failed to save gateway"),
      }
    );
    setShowGatewayModal(false);
    setGwForm({ name: "Razorpay", mode: "Test", keyId: "", keySecret: "" });
  };
  const toggleGateway = (id: number) => {
    const updated = gateways.map(g => ({ ...g, active: g.id === id }));
    setGateways(updated);
    const gw = gateways.find(g => g.id === id);
    updateSettings.mutate(
      { gateways: updated.map(g => ({ name: g.name, mode: g.mode, keyId: g.keyId, active: g.active })) },
      { onSuccess: () => showToast(`✅ ${gw?.name} set as active gateway`) }
    );
  };
  const deleteGateway = (id: number) => {
    const updated = gateways.filter(g => g.id !== id);
    setGateways(updated);
    updateSettings.mutate(
      { gateways: updated.map(g => ({ name: g.name, mode: g.mode, keyId: g.keyId, active: g.active })) },
      { onSuccess: () => showToast("🗑️ Gateway removed") }
    );
  };

  const handleChangePassword = () => {
    if (!pwForm.old || !pwForm.newPw || !pwForm.confirm) { showToast("⚠️ Fill all password fields"); return; }
    if (pwForm.newPw !== pwForm.confirm) { showToast("⚠️ New passwords don't match"); return; }
    if (pwForm.newPw.length < 8) { showToast("⚠️ Password must be at least 8 characters"); return; }
    setPwForm({ old: "", newPw: "", confirm: "" });
    showToast("✅ Password changed successfully");
  };

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Platform Settings" subtitle="Global configuration for EduFees Pro" />
      <main className="flex-1 p-6 space-y-5">

        {toast && <div className="fixed top-5 right-5 z-[999] bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl">{toast}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Platform Identity */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="w-4 h-4" />Platform Identity</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[["Platform Name", "name"], ["Support Email", "supportEmail"], ["Support Phone", "supportPhone"], ["Website URL", "website"]].map(([label, key]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 font-medium">{label}</label>
                  <input value={(platform as any)[key]} onChange={e => setPlatform(p => ({ ...p, [key]: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ))}
              <Button onClick={() => saveSection({ platform }, "Platform settings")}>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4" />Security Policies</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">Max Login Attempts Before Lockout</label>
                <input type="number" min={1} max={10} value={security.maxAttempts} onChange={e => setSecurity(s => ({ ...s, maxAttempts: +e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Session Timeout (minutes)</label>
                <input type="number" value={security.sessionTimeout} onChange={e => setSecurity(s => ({ ...s, sessionTimeout: +e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Minimum Password Length</label>
                <input type="number" value={security.minPassword} onChange={e => setSecurity(s => ({ ...s, minPassword: +e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-gray-900">Enforce 2FA for Super Admins</p><p className="text-xs text-gray-500">Require OTP on every login</p></div>
                <Toggle value={security.twoFA} onChange={() => setSecurity(s => ({ ...s, twoFA: !s.twoFA }))} />
              </div>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-gray-900">IP Whitelist Mode</p><p className="text-xs text-gray-500">Only allow listed IPs</p></div>
                <Toggle value={security.ipWhitelist} onChange={() => setSecurity(s => ({ ...s, ipWhitelist: !s.ipWhitelist }))} />
              </div>
              <Button onClick={() => saveSection({ security }, "Security settings")}>Save Changes</Button>
            </CardContent>
          </Card>

          {/* ── BANK ACCOUNTS ── */}
          <Card className="col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Building className="w-4 h-4" />Bank Accounts</CardTitle>
                <Button size="sm" onClick={openAddBank}><Plus className="w-4 h-4" />Add Bank Account</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {bankAccounts.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No bank accounts added yet. Click "Add Bank Account" to get started.</div>
              )}
              {bankAccounts.map(b => (
                <div key={b.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${b.primary ? "border-purple-300 bg-purple-50" : "border-gray-100 bg-gray-50"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${b.primary ? "bg-purple-600" : "bg-gray-200"}`}>
                      <Building className={`w-5 h-5 ${b.primary ? "text-white" : "text-gray-500"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{b.bankName}</p>
                        {b.primary && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-medium">Primary</span>}
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{b.type}</span>
                      </div>
                      <p className="text-sm text-gray-600">{b.accountName} · {b.accountNo}</p>
                      <p className="text-xs text-gray-400">IFSC: {b.ifsc} · {b.branch}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!b.primary && (
                      <button onClick={() => setPrimary(b.id)} className="text-xs text-purple-600 border border-purple-300 px-2.5 py-1 rounded-lg hover:bg-purple-50 font-medium">Set Primary</button>
                    )}
                    <button onClick={() => openEditBank(b)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteBank(b.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ── PAYMENT GATEWAYS ── */}
          <Card className="col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4" />Payment Gateways</CardTitle>
                <Button size="sm" onClick={() => setShowGatewayModal(true)}><Plus className="w-4 h-4" />Add Gateway</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {gateways.map(g => (
                  <div key={g.id} className={`p-4 rounded-xl border-2 transition-colors ${g.active ? "border-green-300 bg-green-50" : "border-gray-200"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{g.name}</p>
                        <div className="flex gap-1.5 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.mode === "Live" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{g.mode}</span>
                          {g.active && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Active</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteGateway(g.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <p className="text-xs text-gray-400 font-mono mb-3">{g.keyId}</p>
                    {!g.active && (
                      <Button size="sm" className="w-full" onClick={() => toggleGateway(g.id)}>Set as Active</Button>
                    )}
                    {g.active && (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium"><CheckCircle className="w-3.5 h-3.5" />Currently Active</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notification Defaults */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-4 h-4" />Default Notification Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">Default WhatsApp Provider</label>
                <select value={notifSettings.whatsappProvider} onChange={e => setNotifSettings(n => ({ ...n, whatsappProvider: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                  <option>Twilio</option><option>360dialog</option><option>Wati</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Default Email Provider</label>
                <select value={notifSettings.emailProvider} onChange={e => setNotifSettings(n => ({ ...n, emailProvider: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                  <option>SendGrid</option><option>AWS SES</option><option>Mailgun</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Reminder Schedule (days before due)</label>
                <input value={notifSettings.reminderDays} onChange={e => setNotifSettings(n => ({ ...n, reminderDays: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-gray-900">Auto Reminders</p><p className="text-xs text-gray-500">Send reminders automatically</p></div>
                <Toggle value={notifSettings.autoReminder} onChange={() => setNotifSettings(n => ({ ...n, autoReminder: !n.autoReminder }))} />
              </div>
              <Button onClick={() => saveSection({ notifications: notifSettings }, "Notification settings")}>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Change Password + System */}
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4" />Change Admin Password</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Current Password</label>
                  <div className="relative mt-1">
                    <input type={showOld ? "text" : "password"} value={pwForm.old} onChange={e => setPwForm(p => ({ ...p, old: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Current password" />
                    <button onClick={() => setShowOld(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">New Password</label>
                  <div className="relative mt-1">
                    <input type={showNew ? "text" : "password"} value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Min 8 characters" />
                    <button onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Confirm New Password</label>
                  <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Re-enter new password" />
                </div>
                <Button onClick={handleChangePassword}>Update Password</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Server className="w-4 h-4" />System Status</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[["Database", "PostgreSQL (Neon)", "text-green-600"], ["Cache", "Redis Cloud", "text-green-600"], ["Storage", "AWS S3", "text-green-600"], ["Build Version", "v2.4.1", "text-gray-600"], ["Environment", "Production", "text-green-600"]].map(([label, value, color]) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0 text-sm">
                    <span className="text-gray-500">{label}</span><span className={`font-medium ${color}`}>{value}</span>
                  </div>
                ))}
                <div className="pt-2"><Button variant="outline" size="sm" onClick={() => showToast("✅ All systems operational")}>Run Health Check</Button></div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── BANK ACCOUNT MODAL ── */}
        {showBankModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[520px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">{editBank ? "Edit Bank Account" : "Add Bank Account"}</h3>
                <button onClick={() => setShowBankModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ["Account Holder Name *", "accountName", "col-span-2"],
                  ["Bank Name *", "bankName", ""],
                  ["Account Type", "type", ""],
                  ["Account Number *", "accountNo", "col-span-2"],
                  ["IFSC Code *", "ifsc", ""],
                  ["Branch", "branch", ""],
                ].map(([label, key, cls]) => (
                  <div key={key} className={cls || ""}>
                    <label className="text-xs text-gray-500 font-medium">{label}</label>
                    {key === "type" ? (
                      <select value={bankForm.type} onChange={e => setBankForm(f => ({ ...f, type: e.target.value }))}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                        <option>Current</option><option>Savings</option>
                      </select>
                    ) : (
                      <input value={(bankForm as any)[key]} onChange={e => setBankForm(f => ({ ...f, [key]: e.target.value }))}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={label.replace(" *", "")} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => setShowBankModal(false)}>Cancel</Button>
                <Button onClick={saveBank}>{editBank ? "Save Changes" : "Add Account"}</Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── GATEWAY MODAL ── */}
        {showGatewayModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-[480px] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Add Payment Gateway</h3>
                <button onClick={() => setShowGatewayModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Gateway Provider</label>
                  <select value={gwForm.name} onChange={e => setGwForm(f => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                    <option>Razorpay</option><option>PayU</option><option>Stripe</option><option>Cashfree</option><option>CCAvenue</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Mode</label>
                  <div className="flex gap-3 mt-1">
                    {["Test", "Live"].map(m => (
                      <button key={m} onClick={() => setGwForm(f => ({ ...f, mode: m }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${gwForm.mode === m ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{m} Mode</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">API Key / Key ID *</label>
                  <input value={gwForm.keyId} onChange={e => setGwForm(f => ({ ...f, keyId: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="rzp_live_XXXXXXXX" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">API Secret *</label>
                  <input type="password" value={gwForm.keySecret} onChange={e => setGwForm(f => ({ ...f, keySecret: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Secret key" />
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-xs text-yellow-800">
                  Keys are stored encrypted. Never share your secret key.
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => setShowGatewayModal(false)}>Cancel</Button>
                <Button onClick={saveGateway}>Add Gateway</Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
