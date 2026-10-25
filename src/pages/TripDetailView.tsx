import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { PlaceCandidate, TripDetail, TripStop, TripStopInput } from "../api/types";
import { Alert, EmptyState, PageHeader, RefreshButton, SkeletonRows } from "../components/ui";
import { Icon } from "../components/Icon";
import { daysBetween, formatDay, formatRange } from "../components/shared";
import { TripForm } from "./TripForm";
import { TripStopView } from "./TripStopView";
import { navigate } from "../hooks/useRoute";

/** Formulario común de alta y edición de una parada del itinerario. */
function StopForm({
    initial,
    submitLabel,
    busy,
    minDay,
    maxDay,
    onSubmit,
    onCancel,
}: {
    initial: TripStopInput;
    submitLabel: string;
    busy: boolean;
    minDay: string;
    maxDay: string;
    onSubmit: (input: TripStopInput) => void;
    onCancel?: () => void;
}) {
    const [value, setValue] = useState(initial);
    const set = <K extends keyof TripStopInput>(key: K, v: TripStopInput[K]) => setValue((prev) => ({ ...prev, [key]: v }));
    const valid = value.title.trim() !== "" && value.day !== "";

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!valid) return;
        onSubmit({ ...value, title: value.title.trim(), place: value.place.trim(), note: value.note.trim() });
    }

    return (
        <form className="form-stack" onSubmit={handleSubmit}>
            <div className="form-row">
                <input
                    type="date"
                    className="input"
                    aria-label="Día"
                    min={minDay < value.day ? minDay : value.day}
                    max={maxDay > value.day ? maxDay : value.day}
                    value={value.day}
                    onChange={(e) => set("day", e.target.value)}
                />
                <input type="time" className="input" aria-label="Hora (opcional)" value={value.time} onChange={(e) => set("time", e.target.value)} />
            </div>
            <div className="form-row">
                <input
                    className="input"
                    placeholder="Actividad o parada"
                    aria-label="Actividad"
                    maxLength={120}
                    value={value.title}
                    onChange={(e) => set("title", e.target.value)}
                    autoFocus={onCancel !== undefined}
                />
                <input
                    className="input"
                    placeholder="Lugar (opcional)"
                    aria-label="Lugar"
                    maxLength={120}
                    value={value.place}
                    onChange={(e) => set("place", e.target.value)}
                />
            </div>
            <div className="form-row" style={{ flexWrap: "nowrap" }}>
                <input
                    className="input"
                    placeholder="Nota (opcional)"
                    aria-label="Nota"
                    maxLength={500}
                    value={value.note}
                    onChange={(e) => set("note", e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={busy || !valid}>
                    {submitLabel}
                </button>
                {onCancel && (
                    <button type="button" className="btn" onClick={onCancel} disabled={busy}>
                        Cancelar
                    </button>
                )}
            </div>
        </form>
    );
}

function stopToInput(s: TripStop): TripStopInput {
    return { title: s.title, day: s.day, time: s.time ?? "", place: s.place ?? "", note: s.note ?? "" };
}

/** Agrupa las paradas (ya ordenadas por la API) por día. */
function groupByDay(stops: TripStop[]): { day: string; stops: TripStop[] }[] {
    const groups: { day: string; stops: TripStop[] }[] = [];
    for (const s of stops) {
        const last = groups[groups.length - 1];
        if (last && last.day === s.day) last.stops.push(s);
        else groups.push({ day: s.day, stops: [s] });
    }
    return groups;
}

export function TripDetailView({ tripId, stopId, onBack }: { tripId: number; stopId: number | null; onBack: () => void }) {
    const { data, error, loading, refresh } = usePolling(() => api.trip(tripId), 30_000);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [editingTrip, setEditingTrip] = useState(false);
    const [editingStopId, setEditingStopId] = useState<number | null>(null);
    const [stopFormKey, setStopFormKey] = useState(0);
    const [packingName, setPackingName] = useState("");
    // Varios lugares encajan con el texto escrito: se elige cuál guardar (o guardar la parada sin mapa).
    const [choices, setChoices] = useState<{ previous: TripStop | null; input: TripStopInput; places: PlaceCandidate[] } | null>(null);

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

    const backButton = (
        <button className="btn btn-sm" onClick={onBack}>
            <Icon name="chevronLeft" size={16} />
            Viajes
        </button>
    );

    // El viaje no existe (borrado desde otro dispositivo) o aún está cargando.
    if (data === null) {
        return (
            <div className="page">
                <PageHeader title="Viaje" actions={backButton} />
                {error ? <Alert>{error}</Alert> : <SkeletonRows rows={3} />}
            </div>
        );
    }

    const trip: TripDetail = data;

    /**
     * Guarda una parada nueva (`previous` null) o la edición de `previous`. Si el lugar es nuevo o ha cambiado se busca
     * en el mapa: sin resultados se guarda sin ubicación, con uno se usa ese y con varios se abre la elección.
     * Un fallo al buscar no impide guardar la parada.
     */
    async function saveStop(previous: TripStop | null, input: TripStopInput, chosen?: PlaceCandidate | null) {
        const place = input.place.trim();
        const persist = (location: PlaceCandidate | "clear" | undefined) =>
            previous
                ? api.updateTripStop(trip.id, previous.id, input, location)
                : api.addTripStop(trip.id, input, location === "clear" ? undefined : location);

        if (chosen !== undefined) return persist(chosen ?? (previous ? "clear" : undefined));
        if (place === "") return persist(previous ? "clear" : undefined);
        if (previous && (previous.place ?? "") === place) return persist(undefined);

        let places: PlaceCandidate[] = [];
        try {
            places = await api.searchTripPlaces(place);
        } catch {
            // sin servicio de búsqueda la parada se guarda igualmente, sin ubicación
        }
        if (places.length === 0) return persist(previous ? "clear" : undefined);
        if (places.length === 1) return persist(places[0]);
        setChoices({ previous, input, places });
    }

    // La parada abierta viene de la URL (`#/trips/2/stops/17`); anterior/siguiente sustituyen la entrada del historial,
    // así "atrás" vuelve al viaje y no recorre todas las paradas vistas.
    if (stopId !== null) {
        return (
            <TripStopView
                trip={trip}
                stop={trip.stops.find((s) => s.id === stopId)}
                onBack={() => navigate(`/trips/${trip.id}`)}
                onOpen={(id) => navigate(`/trips/${trip.id}/stops/${id}`, true)}
            />
        );
    }

    const totalDays = daysBetween(trip.startDate, trip.endDate) + 1;
    const checked = trip.packing.filter((p) => p.checked).length;

    function dayLabel(day: string): string {
        const n = daysBetween(trip.startDate, day) + 1;
        return n >= 1 && n <= totalDays ? `Día ${n} · ${formatDay(day)}` : formatDay(day);
    }

    return (
        <div className="page">
            <PageHeader
                title={trip.name}
                subtitle={`${trip.destination} · ${formatRange(trip.startDate, trip.endDate)}${trip.note ? ` · ${trip.note}` : ""}`}
                actions={
                    <>
                        {backButton}
                        <button className="btn btn-sm" onClick={() => setEditingTrip((v) => !v)} disabled={busy}>
                            <Icon name="edit" size={16} />
                            Editar
                        </button>
                        <button
                            className="btn btn-sm btn-danger"
                            disabled={busy}
                            onClick={() => {
                                if (!window.confirm(`¿Eliminar el viaje "${trip.name}" con su itinerario y su equipaje?`)) return;
                                void run(async () => {
                                    await api.deleteTrip(trip.id);
                                    onBack();
                                });
                            }}
                        >
                            <Icon name="trash" size={16} />
                            Eliminar
                        </button>
                        <RefreshButton onClick={refresh} loading={loading} disabled={busy} />
                    </>
                }
            />

            {error && <Alert>{error}</Alert>}
            {actionError && <Alert>{actionError}</Alert>}

            {editingTrip && (
                <div className="card">
                    <TripForm
                        initial={{ name: trip.name, destination: trip.destination, startDate: trip.startDate, endDate: trip.endDate, note: trip.note ?? "" }}
                        submitLabel="Guardar"
                        busy={busy}
                        onCancel={() => setEditingTrip(false)}
                        onSubmit={(input) => {
                            setEditingTrip(false);
                            void run(() => api.updateTrip(trip.id, input));
                        }}
                    />
                </div>
            )}

            <section>
                <h2 className="card-title">Itinerario</h2>
                <div className="card">
                    <StopForm
                        key={stopFormKey}
                        initial={{ title: "", day: trip.startDate, time: "", place: "", note: "" }}
                        submitLabel="Añadir"
                        busy={busy}
                        minDay={trip.startDate}
                        maxDay={trip.endDate}
                        onSubmit={(input) => {
                            setStopFormKey((k) => k + 1);
                            void run(() => saveStop(null, input));
                        }}
                    />
                </div>
                {choices && (
                    <div className="card flush">
                        <div className="group-label">¿Cuál es «{choices.input.place}»?</div>
                        {choices.places.map((p, i) => (
                            <div key={i} className="list-row row-wrap">
                                <span className="row-icon">
                                    <Icon name="pin" />
                                </span>
                                <div className="row-main">
                                    <div className="row-sub">{p.displayName}</div>
                                </div>
                                <div className="row-actions">
                                    <button
                                        className="btn btn-sm btn-primary"
                                        disabled={busy}
                                        onClick={() => {
                                            const c = choices;
                                            setChoices(null);
                                            void run(() => saveStop(c.previous, c.input, p));
                                        }}
                                    >
                                        Elegir
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="list-row">
                            <button
                                className="btn btn-sm"
                                disabled={busy}
                                onClick={() => {
                                    const c = choices;
                                    setChoices(null);
                                    void run(() => saveStop(c.previous, c.input, null));
                                }}
                            >
                                Guardar sin mapa
                            </button>
                            <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setChoices(null)}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
                <div className="card flush">
                    {trip.stops.length === 0 ? (
                        <EmptyState icon="pin" title="Sin itinerario" text="Añade paradas o actividades con su día y hora." />
                    ) : (
                        groupByDay(trip.stops).map((g) => (
                            <div key={g.day}>
                                <div className="group-label">{dayLabel(g.day)}</div>
                                {g.stops.map((s) =>
                                    editingStopId === s.id ? (
                                        <div key={s.id} className="list-row row-wrap">
                                            <StopForm
                                                initial={stopToInput(s)}
                                                submitLabel="Guardar"
                                                busy={busy}
                                                minDay={trip.startDate}
                                                maxDay={trip.endDate}
                                                onCancel={() => setEditingStopId(null)}
                                                onSubmit={(input) => {
                                                    setEditingStopId(null);
                                                    void run(() => saveStop(s, input));
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div key={s.id} className="list-row clickable row-wrap" onClick={() => navigate(`/trips/${trip.id}/stops/${s.id}`)}>
                                            <span className="badge badge-accent">{s.time ?? "—"}</span>
                                            <div className="row-main">
                                                <div className="row-title">
                                                    {s.title}
                                                    {typeof s.latitude === "number" && typeof s.longitude === "number" && (
                                                        <span className="stop-pin" title="Con ubicación en el mapa" aria-label="Con ubicación en el mapa">
                                                            <Icon name="pin" size={14} />
                                                        </span>
                                                    )}
                                                </div>
                                                {(s.place || s.note) && <div className="row-sub">{[s.place, s.note].filter(Boolean).join(" · ")}</div>}
                                            </div>
                                            <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="btn btn-ghost btn-sm icon-btn"
                                                    disabled={busy}
                                                    onClick={() => setEditingStopId(s.id)}
                                                    aria-label={`Editar ${s.title}`}
                                                    title="Editar"
                                                >
                                                    <Icon name="edit" size={17} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm icon-btn"
                                                    disabled={busy}
                                                    onClick={() => void run(() => api.deleteTripStop(trip.id, s.id))}
                                                    aria-label={`Eliminar ${s.title}`}
                                                    title="Eliminar"
                                                >
                                                    <Icon name="trash" size={17} />
                                                </button>
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section>
                <h2 className="card-title">
                    Equipaje {trip.packing.length > 0 && <span className="badge">{checked}/{trip.packing.length}</span>}
                </h2>
                <form
                    className="card"
                    onSubmit={(e) => {
                        e.preventDefault();
                        const name = packingName.trim();
                        if (!name) return;
                        setPackingName("");
                        void run(() => api.addPackingItem(trip.id, name));
                    }}
                >
                    <div className="form-row" style={{ flexWrap: "nowrap" }}>
                        <input
                            className="input"
                            placeholder="Añadir a la maleta…"
                            aria-label="Elemento de equipaje"
                            maxLength={120}
                            value={packingName}
                            onChange={(e) => setPackingName(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary" disabled={busy || !packingName.trim()}>
                            Añadir
                        </button>
                    </div>
                </form>
                <div className="card flush">
                    {trip.packing.length === 0 ? (
                        <EmptyState icon="bookmark" title="Maleta vacía" text="Apunta lo que no quieres olvidar." />
                    ) : (
                        <>
                            {trip.packing.map((p) => (
                                <div key={p.id} className={`list-row${p.checked ? " is-checked" : ""}`}>
                                    <input
                                        type="checkbox"
                                        className="check"
                                        checked={p.checked}
                                        disabled={busy}
                                        onChange={() => void run(() => api.updatePackingItem(trip.id, p.id, { checked: !p.checked }))}
                                        aria-label={`${p.checked ? "Desmarcar" : "Marcar"} ${p.name}`}
                                    />
                                    <div className="row-main">
                                        <div className="row-title">{p.name}</div>
                                    </div>
                                    <div className="row-actions">
                                        <button
                                            className="btn btn-ghost btn-sm icon-btn"
                                            disabled={busy}
                                            onClick={() => void run(() => api.deletePackingItem(trip.id, p.id))}
                                            aria-label={`Eliminar ${p.name}`}
                                            title="Eliminar"
                                        >
                                            <Icon name="trash" size={17} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {checked > 0 && (
                                <div className="list-row">
                                    <button className="btn btn-sm" disabled={busy} onClick={() => void run(() => api.uncheckAllPacking(trip.id))}>
                                        Desmarcar todo
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
