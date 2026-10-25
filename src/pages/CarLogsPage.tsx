import { useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatDate, levelBadge } from "../components/shared";
import { Alert, EmptyState, PageHeader, RefreshButton, SkeletonRows } from "../components/ui";

const LEVELS = ["", "DEBUG", "INFO", "WARNING", "ERROR"];

export function CarLogsPage() {
    const [level, setLevel] = useState("");
    const { data: logs, error, loading, refresh } = usePolling(() => api.carLogs({ level: level || undefined, limit: 300 }), 20_000);

    return (
        <div className="page">
            <PageHeader
                title="Actividad"
                subtitle="Diario de BluetoothLocator"
                actions={
                    <>
                        <select className="select select-inline" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filtrar por nivel">
                            {LEVELS.map((l) => (
                                <option key={l} value={l}>
                                    {l || "Todos los niveles"}
                                </option>
                            ))}
                        </select>
                        <RefreshButton onClick={refresh} loading={loading} />
                    </>
                }
            />

            {error && <Alert>{error}</Alert>}

            <div className="card flush">
                {logs === null && loading ? (
                    <SkeletonRows rows={5} />
                ) : logs !== null && logs.length === 0 ? (
                    <EmptyState icon="activity" title="Sin actividad" text="Cuando un dispositivo se conecte o desconecte, quedará registrado aquí." />
                ) : (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Nivel</th>
                                    <th>Origen</th>
                                    <th>Mensaje</th>
                                    <th>Dispositivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(logs ?? []).map((l) => (
                                    <tr key={l.id}>
                                        <td data-label="Fecha" className="cell-nowrap cell-muted">
                                            {formatDate(l.timestamp)}
                                        </td>
                                        <td data-label="Nivel">
                                            <span className={`badge ${levelBadge[l.level] ?? ""}`}>{l.level}</span>
                                        </td>
                                        <td data-label="Origen">{l.tag}</td>
                                        <td data-label="Mensaje">{l.message}</td>
                                        <td data-label="Dispositivo" className="cell-muted">
                                            {l.deviceId ?? "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
