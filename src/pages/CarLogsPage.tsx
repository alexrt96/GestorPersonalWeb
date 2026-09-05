import { useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatDate, levelColor, shared } from "../components/shared";

const LEVELS = ["", "DEBUG", "INFO", "WARNING", "ERROR"];

export function CarLogsPage() {
    const [level, setLevel] = useState("");
    const { data: logs, error, loading, refresh } = usePolling(() => api.carLogs({ level: level || undefined, limit: 300 }), 20_000);

    return (
        <div style={shared.page}>
            <div style={shared.headerRow}>
                <h1 style={shared.pageTitle}>Diario de actividad — BluetoothLocator</h1>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select style={shared.select} value={level} onChange={(e) => setLevel(e.target.value)}>
                        {LEVELS.map((l) => (
                            <option key={l} value={l}>
                                {l || "Todos los niveles"}
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
                            <th style={shared.th}>Nivel</th>
                            <th style={shared.th}>Origen</th>
                            <th style={shared.th}>Mensaje</th>
                            <th style={shared.th}>Dispositivo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(logs ?? []).map((l) => (
                            <tr key={l.id}>
                                <td style={shared.td}>{formatDate(l.timestamp)}</td>
                                <td style={{ ...shared.td, color: levelColor[l.level] ?? "var(--color-text)" }}>{l.level}</td>
                                <td style={shared.td}>{l.tag}</td>
                                <td style={shared.td}>{l.message}</td>
                                <td style={shared.td}>{l.deviceId ?? "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {logs !== null && logs.length === 0 && <div style={shared.empty}>Sin entradas de actividad.</div>}
            </div>
        </div>
    );
}
