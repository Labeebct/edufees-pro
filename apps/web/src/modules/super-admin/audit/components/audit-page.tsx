"use client";
import { useState } from "react";
import { Topbar } from "@/modules/shared/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card";
import { Badge } from "@/modules/shared/ui/badge";
import { useAuditLogs, type AuditEntry } from "@/lib/api/hooks/useSuperAdmin";
import { Search } from "lucide-react";

const severityBadge = (action: string) => {
  if (action.includes("SUSPEND") || action.includes("FAILED")) return <Badge variant="danger">Critical</Badge>;
  if (action.includes("UPDATE") || action.includes("DELETE")) return <Badge variant="warning">Warning</Badge>;
  return <Badge variant="info">Info</Badge>;
};

export function AuditPage() {
  const [search, setSearch] = useState("");
  const logsQuery = useAuditLogs({ pageSize: 100 });
  const logs = (logsQuery.data?.data ?? []).map((l: AuditEntry) => ({
    id: l.id,
    ts: new Date(l.createdAt).toLocaleString(),
    actor: l.actorUsername ?? l.actorEmail ?? l.performedById.slice(-8),
    role: l.actorRole ?? "—",
    institute: l.schoolId?.slice(-8) ?? "—",
    action: l.action,
    resource: `${l.entityType} ${l.entityId}`,
    ip: l.ipAddress ?? "—",
    severity: l.action.includes("SUSPEND") || l.action.includes("FAILED") ? "danger" : l.action.includes("UPDATE") ? "warning" : "info",
  }));

  const filtered = logs.filter((l: typeof logs[0]) =>
    l.actor.includes(search) || l.action.includes(search) || l.resource.includes(search) || l.institute.includes(search)
  );

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Audit Logs" subtitle="Full trail of all actions across the platform" />
      <main className="flex-1 p-6 space-y-5">

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by actor, action, resource..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Audit Trail ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Timestamp", "Actor", "Institute", "Action", "Resource", "IP", "Severity"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No audit logs yet</td></tr>}
                {filtered.map(l => (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-purple-50/20">
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{l.ts}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{l.actor}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{l.institute}</td>
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-purple-700">{l.action}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{l.resource}</td>
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono">{l.ip}</td>
                    <td className="px-4 py-3">{severityBadge(l.action)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
