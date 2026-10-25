import { useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatDate } from "../components/shared";
import { Alert, EmptyState, RefreshButton, SkeletonRows } from "../components/ui";

export function WoffuLogsPage() {
    const { data: logs, error, loading, refresh } = usePolling(() => api.woffuLogs(200), 30_000);
    const [typeFilter, setTypeFilter] = useState("");

    const types = [...new Set((logs ?? []).map((l) => l.type))].sort();
    const visible = typeFilter ? (logs ?? []).filter((l) => l.type === typeFilter) : logs ?? [];

    return (
        <>
            <div className="page-header">
                <div className="page-header-text">
                    <h2 className="page-title" style={{ fontSize: 18 }}>
                        Actividad
                    </h2>
                    <p className="page-subtitle">Fichajes y avisos de WoffuManager</p>
                </div>
                <div className="page-actions">
                    <select className="select select-inline" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filtrar por tipo">
                        <option value="">Todos los tipos</option>
                        {types.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                    <RefreshButton onClick={refresh} loading={loading} />
                </div>
            </div>

            {error && <Alert>{error}</Alert>}

            <div className="card flush">
                {logs === null && loading ? (
                    <SkeletonRows rows={5} />
                ) : logs !== null && visible.length === 0 ? (
                    <EmptyState icon="activity" title="Sin registros" text="Aquí aparecerán los fichajes automáticos y los avisos." />
                ) : (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th>Mensaje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((l) => (
                                    <tr key={l.id}>
                                        <td data-label="Fecha" className="cell-nowrap cell-muted">
                                            {formatDate(l.timestamp)}
                                        </td>
                                        <td data-label="Tipo">
                                            <span className="badge badge-accent">{l.type}</span>
                                        </td>
                                        <td data-label="Mensaje">{l.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
