import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { PlaceCandidate, TripDetail, TripStop, TripStopInput } from "../api/types";
import { Alert, EmptyState, PageHeader, RefreshButton, SkeletonRows } from "../components/ui";
import { Icon } from "../components/Icon";
import { MapView } from "../components/MapView";
import type { MapPoint } from "../components/MapView";
import { useConfirm } from "../components/ConfirmDialog";
import { daysBetween, formatDay, formatRange, todayIso } from "../components/shared";
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

function hasLocation(s: TripStop): s is TripStop & { latitude: number; longitude: number } {
    return typeof s.latitude === "number" && typeof s.longitude === "number";
}

/**
 * Número de cada parada con ubicación dentro de su día (1, 2, 3… en el orden del itinerario). Es el que se ve en el
 * pin del mapa del día y junto a la parada en la lista, para poder relacionarlos.
 */
function stopNumbers(stops: TripStop[]): Map<number, number> {
    const numbers = new Map<number, number>();
    stops.filter(hasLocation).forEach((s, i) => numbers.set(s.id, i + 1));
    return numbers;
}

/** Mapa de un día: sus paradas con ubicación, numeradas y unidas en orden. El globo de cada pin abre la parada. */
function DayMap({ stops, onOpen }: { stops: TripStop[]; onOpen: (stopId: number) => void }) {
    const located = stops.filter(hasLocation);
    if (located.length === 0) return null;
    const points: MapPoint[] = located.map((s, i) => ({
        id: s.id,
        lat: s.latitude,
        lng: s.longitude,
        label: String(i + 1),
        popup: (
            <div className="map-popup">
                <strong>
                    {i + 1}. {s.title}
                </strong>
                {(s.time || s.place) && <span>{[s.time, s.place].filter(Boolean).join(" · ")}</span>}
                <button className="btn btn-sm btn-primary map-popup-action" onClick={() => onOpen(s.id)}>
                    Abrir parada
                </button>
            </div>
        ),
    }));
    return (
        <div className="map-card day-map">
            <MapView points={points} route fitMaxZoom={15} focusZoom={15} />
        </div>
    );
}

export type TripTab = "itinerary" | "packing";

const TAB_KEY = (tripId: number) => `gestorpersonal.tripTab.${tripId}`;

/** Última pestaña usada en cada viaje (en este navegador): si estabas haciendo la maleta, el viaje se abre en Equipaje. */
function readTripTab(tripId: number): TripTab | null {
    try {
        const v = localStorage.getItem(TAB_KEY(tripId));
        return v === "packing" || v === "itinerary" ? v : null;
    } catch {
        return null;
    }
}

function storeTripTab(tripId: number, tab: TripTab): void {
    try {
        localStorage.setItem(TAB_KEY(tripId), tab);
    } catch {
        // sin almacenamiento: simplemente no se recuerda
    }
}

/** "D3 · lun 23" (o solo la fecha si el día cae fuera de las fechas del viaje). */
function chipLabel(day: string, startDate: string, totalDays: number): string {
    const n = daysBetween(startDate, day) + 1;
    const [y, m, d] = day.split("-").map(Number);
    const short = new Date(y, m - 1, d).toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
    return n >= 1 && n <= totalDays ? `D${n} · ${short}` : short;
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

export function TripDetailView({
    tripId,
    stopId,
    tab,
    onBack,
}: {
    tripId: number;
    stopId: number | null;
    tab: TripTab;
    onBack: () => void;
}) {
    const { data, error, loading, refresh } = usePolling(() => api.trip(tripId), 30_000);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [editingTrip, setEditingTrip] = useState(false);
    const [confirmDialog, confirm] = useConfirm();
    const [editingStopId, setEditingStopId] = useState<number | null>(null);
    const [stopFormKey, setStopFormKey] = useState(0);
    const [packingName, setPackingName] = useState("");
    // Varios lugares encajan con el texto escrito: se elige cuál guardar (o guardar la parada sin mapa).
    const [choices, setChoices] = useState<{ previous: TripStop | null; input: TripStopInput; places: PlaceCandidate[] } | null>(null);
    // Pestañas: cada una recuerda su posición de scroll; el día que se está viendo resalta su chip.
    const scrollByTab = useRef<Partial<Record<TripTab, number>>>({});
    const [activeDay, setActiveDay] = useState<string | null>(null);
    const chipsRef = useRef<HTMLDivElement>(null);
    const jumpedToToday = useRef(false);

    // Al abrir el viaje sin pestaña en la URL, si la última vez se usó Equipaje se vuelve a ella.
    useEffect(() => {
        if (stopId === null && tab === "itinerary" && readTripTab(tripId) === "packing") {
            navigate(`/trips/${tripId}/packing`, true);
        }
        // Solo al montar (cada viaje se monta de nuevo: key={tripId}).
        // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Al cambiar de pestaña se recupera su scroll (después del "volver arriba" que hace App al cambiar la URL).
    useEffect(() => {
        if (stopId !== null) return;
        storeTripTab(tripId, tab);
        const y = scrollByTab.current[tab] ?? 0;
        const frame = requestAnimationFrame(() => window.scrollTo(0, y));
        return () => cancelAnimationFrame(frame);
    }, [tab, tripId, stopId]);

    // Día visible = el último cuya cabecera ya ha pasado bajo la barra fija de pestañas y chips.
    useEffect(() => {
        if (tab !== "itinerary" || stopId !== null) return;
        let frame = 0;
        const update = () => {
            frame = 0;
            const nav = document.querySelector(".trip-nav");
            const limit = (nav?.getBoundingClientRect().bottom ?? 120) + 24;
            let current: string | null = null;
            document.querySelectorAll<HTMLElement>("[data-day]").forEach((el) => {
                if (el.getBoundingClientRect().top <= limit) current = el.dataset.day ?? null;
            });
            setActiveDay(current ?? document.querySelector<HTMLElement>("[data-day]")?.dataset.day ?? null);
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [tab, stopId, data]);

    // La fila de chips se desplaza sola para que el chip del día visible quede a la vista.
    useEffect(() => {
        const row = chipsRef.current;
        const chip = row?.querySelector<HTMLElement>(".chip.active");
        if (row && chip) row.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
    }, [activeDay]);

    // Durante el viaje, la primera vez que se abre el itinerario se baja directamente al día de hoy.
    useEffect(() => {
        if (jumpedToToday.current || data === null || tab !== "itinerary" || stopId !== null) return;
        jumpedToToday.current = true;
        if (!data.stops.some((s) => s.day === todayIso())) return;
        const frame = requestAnimationFrame(() => document.getElementById(`day-${todayIso()}`)?.scrollIntoView({ block: "start" }));
        return () => cancelAnimationFrame(frame);
    }, [data, tab, stopId]);

    function switchTab(next: TripTab) {
        if (next === tab) return;
        scrollByTab.current[tab] = window.scrollY;
        navigate(next === "packing" ? `/trips/${tripId}/packing` : `/trips/${tripId}`, true);
    }

    function jumpToDay(day: string) {
        document.getElementById(`day-${day}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

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
    const groups = groupByDay(trip.stops);

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
                            onClick={async () => {
                                const ok = await confirm({
                                    title: `¿Eliminar el viaje «${trip.name}»?`,
                                    body: "Se borran también su itinerario y su lista de equipaje, para todos los usuarios.",
                                    confirmLabel: "Eliminar viaje",
                                    destructive: true,
                                });
                                if (!ok) return;
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

            {confirmDialog}
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

            {/* Pestañas + chips de días: fijas bajo la cabecera mientras se hace scroll. */}
            <div className="trip-nav">
                <div className="segmented" role="tablist" aria-label="Secciones del viaje">
                    <button role="tab" aria-selected={tab === "itinerary"} className={tab === "itinerary" ? "active" : ""} onClick={() => switchTab("itinerary")}>
                        <Icon name="pin" size={15} />
                        Itinerario
                    </button>
                    <button role="tab" aria-selected={tab === "packing"} className={tab === "packing" ? "active" : ""} onClick={() => switchTab("packing")}>
                        <Icon name="bookmark" size={15} />
                        Equipaje
                        {trip.packing.length > 0 && (
                            <span className={`badge${checked === trip.packing.length ? " badge-success" : ""}`}>
                                {checked}/{trip.packing.length}
                            </span>
                        )}
                    </button>
                </div>
                {tab === "itinerary" && groups.length > 1 && (
                    <div className="day-chips" ref={chipsRef} aria-label="Ir a un día">
                        {groups.map((g) => (
                            <button
                                key={g.day}
                                className={`chip${activeDay === g.day ? " active" : ""}`}
                                aria-current={activeDay === g.day ? "true" : undefined}
                                onClick={() => jumpToDay(g.day)}
                            >
                                {g.day === todayIso() ? "Hoy · " : ""}
                                {chipLabel(g.day, trip.startDate, totalDays)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {tab === "itinerary" && (
            <section className="tab-panel">
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
                        groups.map((g) => {
                            const numbers = stopNumbers(g.stops);
                            return (
                            <div key={g.day} id={`day-${g.day}`} data-day={g.day} className="day-group">
                                <div className="group-label">
                                    {dayLabel(g.day)}
                                    {g.day === todayIso() && <span className="badge badge-accent">Hoy</span>}
                                </div>
                                <DayMap stops={g.stops} onOpen={(id) => navigate(`/trips/${trip.id}/stops/${id}`)} />
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
                                                    {numbers.has(s.id) && (
                                                        <span
                                                            className="stop-num"
                                                            title={`Punto ${numbers.get(s.id)} en el mapa del día`}
                                                            aria-label={`Punto ${numbers.get(s.id)} en el mapa del día`}
                                                        >
                                                            {numbers.get(s.id)}
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
                            );
                        })
                    )}
                </div>
            </section>
            )}

            {tab === "packing" && (
            <section className="tab-panel">
                {trip.packing.length > 0 && (
                    <div className="packing-progress">
                        <div className="progress">
                            <span
                                className={checked === trip.packing.length ? "is-done" : ""}
                                style={{ width: `${(checked / trip.packing.length) * 100}%` }}
                            />
                        </div>
                        <span>{checked === trip.packing.length ? "¡Todo listo!" : `${checked} de ${trip.packing.length}`}</span>
                    </div>
                )}
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
            )}
        </div>
    );
}
