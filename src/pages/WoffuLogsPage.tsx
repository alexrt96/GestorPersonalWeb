import { useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatDate, shared } from "../components/shared";

export function WoffuLogsPage() {
    const { data: logs, error, loading, refresh } = usePolling(() => api.woffuLogs(200), 30_000);
    const [typeFilter, setTypeFilter] = useState("");

    const types = [...new Set((logs ?? []).map((l) => l.type))].sort();
    const visible = typeFilter ? (logs ?? []).filter((l) => l.type === typeFilter) : logs ?? [];

    return (
        <div style={shared.page}>
            <div style={shared.headerRow}>
                <h1 style={shared.pageTitle}>WoffuManager — Actividad</h1>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select style={shared.select} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="">Todos los tipos</option>
                        {types.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                    <button style={shared.refreshButton} onClick={refresh} disabled={loading}>
                        {loading ? "Actualizando…" : "Actualizar"}
                    </button>
                </div>
            </div>

            {error && <div style={shared.errorBox}>{error}</div>}

            <div style={shared.card}>
                <table style={shared.table}>
                    <thead>
                        <tr>
                            <th style={shared.th}>Fecha</th>
                            <th style={shared.th}>Tipo</th>
                            <th style={shared.th}>Mensaje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((l) => (
                            <tr key={l.id}>
                                <td style={shared.td}>{formatDate(l.timestamp)}</td>
                                <td style={shared.td}>
                                    <span style={shared.tag}>{l.type}</span>
                                </td>
                                <td style={shared.td}>{l.message}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {logs !== null && visible.length === 0 && <div style={shared.empty}>Sin registros de actividad.</div>}
            </div>
        </div>
    );
}
