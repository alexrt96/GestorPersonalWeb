import { useState } from "react";
import { api, ApiError } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { Trip, TripInput } from "../api/types";
import { Alert, EmptyState, PageHeader, RefreshButton, SkeletonRows } from "../components/ui";
import { Icon } from "../components/Icon";
import { daysFromToday, formatRange, todayIso } from "../components/shared";
import { navigate, routeId, useRoute } from "../hooks/useRoute";
import { TripDetailView } from "./TripDetailView";
import { TripForm } from "./TripForm";

function emptyInput(): TripInput {
    const today = todayIso();
    return { name: "", destination: "", startDate: today, endDate: today, note: "" };
}

/** "En curso" / "Próximo" / "Pasado" según las fechas del viaje. */
function tripState(t: Trip): "ongoing" | "upcoming" | "past" {
    if (daysFromToday(t.endDate) < 0) return "past";
    if (daysFromToday(t.startDate) > 0) return "upcoming";
    return "ongoing";
}

/** Rutas: `#/trips` (lista), `#/trips/2` (viaje) y `#/trips/2/stops/17` (parada). */
export function TripsPage() {
    const route = useRoute();
    const tripId = routeId(route[1]);
    const stopId = route[2] === "stops" ? routeId(route[3]) : null;
    if (tripId !== null) {
        return <TripDetailView key={tripId} tripId={tripId} stopId={stopId} onBack={() => navigate("/trips")} />;
    }
    return <TripsList onOpen={(id) => navigate(`/trips/${id}`)} />;
}

function TripsList({ onOpen }: { onOpen: (id: number) => void }) {
    const { data, error, loading, refresh } = usePolling(api.trips, 60_000);
    const trips = data ?? [];
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [formKey, setFormKey] = useState(0);

    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setActionError(null);
        try {
            await action();
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : "No se pudo conectar con la API");
        } finally {
            setBusy(false);
            refresh();
        }
    }

    const groups = [
        { label: "En curso", items: trips.filter((t) => tripState(t) === "ongoing") },
        { label: "Próximos", items: trips.filter((t) => tripState(t) === "upcoming").sort((a, b) => a.startDate.localeCompare(b.startDate)) },
        { label: "Pasados", items: trips.filter((t) => tripState(t) === "past") },
    ];

    function countdown(t: Trip): string | null {
        const state = tripState(t);
        if (state === "ongoing") return "En curso";
        if (state === "upcoming") {
            const days = daysFromToday(t.startDate);
            return days === 1 ? "Mañana" : `En ${days} días`;
        }
        return null;
    }

    return (
        <div className="page">
            <PageHeader
                title="Viajes"
                subtitle={data ? `${trips.length} viaje${trips.length === 1 ? "" : "s"} · compartidos con todos los usuarios` : "Compartidos con todos los usuarios"}
                actions={<RefreshButton onClick={refresh} loading={loading} disabled={busy} />}
            />

            {error && <Alert>{error}</Alert>}
            {actionError && <Alert>{actionError}</Alert>}

            <div className="card">
                <TripForm
                    key={formKey}
                    initial={emptyInput()}
                    submitLabel="Crear viaje"
                    busy={busy}
                    onSubmit={(input) => {
                        setFormKey((k) => k + 1);
                        void run(async () => onOpen((await api.addTrip(input)).id));
                    }}
                />
            </div>

            <div className="card flush">
                {data === null && loading ? (
                    <SkeletonRows rows={3} />
                ) : trips.length === 0 ? (
                    <EmptyState icon="plane" title="Sin viajes todavía" text="Crea un viaje y añade su itinerario y la lista de equipaje." />
                ) : (
                    groups
                        .filter((g) => g.items.length > 0)
                        .map((g) => (
                            <div key={g.label}>
                                <div className="group-label">{g.label}</div>
                                {g.items.map((t) => {
                                    const badge = countdown(t);
                                    return (
                                        <div key={t.id} className={`list-row clickable row-wrap${g.label === "Pasados" ? " is-checked" : ""}`} onClick={() => onOpen(t.id)}>
                                            <span className="row-icon">
                                                <Icon name="plane" />
                                            </span>
                                            <div className="row-main">
                                                <div className="row-title">{t.name}</div>
                                                <div className="row-sub">
                                                    {t.destination} · {formatRange(t.startDate, t.endDate)}
                                                </div>
                                                <div className="row-sub">
                                                    {t.stopCount} parada{t.stopCount === 1 ? "" : "s"} · equipaje {t.packingChecked}/{t.packingCount}
                                                </div>
                                            </div>
                                            <div className="row-actions">
                                                {badge && <span className={`badge ${tripState(t) === "ongoing" ? "badge-success" : "badge-accent"}`}>{badge}</span>}
                                                <Icon name="chevronRight" size={17} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}
