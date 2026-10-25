import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { api, ApiError } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { Destination, PlaceCandidate } from "../api/types";
import { Alert, EmptyState, PageHeader, RefreshButton, SkeletonRows } from "../components/ui";
import { Icon } from "../components/Icon";

/** Categorías que se pueden asignar a un destino (la API guarda el texto tal cual). */
const CATEGORIES = ["Restaurante", "Viaje", "Ocio", "Compras", "Otros"];

const defaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

/** Marcador de los destinos ya visitados: el mismo icono, teñido de verde por CSS (.marker-visited). */
const visitedIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: "marker-visited",
});

/** Reencuadra el mapa para que se vean los destinos indicados cada vez que cambian. */
function FitToDestinations({ destinations }: { destinations: Destination[] }) {
    const map = useMap();
    useEffect(() => {
        if (destinations.length === 0) return;
        const bounds = L.latLngBounds(destinations.map((d) => [d.latitude, d.longitude] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }, [destinations, map]);
    return null;
}

export function DestinationsPage() {
    const { data, error, loading, refresh } = usePolling(api.destinations, 30_000);
    const destinations = data ?? [];
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [focused, setFocused] = useState<Destination | null>(null);
    // Edición en línea de un destino (nombre, nota y categoría).
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editNote, setEditNote] = useState("");
    const [editCategory, setEditCategory] = useState("");
    // Varios lugares encajan con lo escrito: el usuario elige cuál guardar.
    const [choices, setChoices] = useState<{ query: string; places: PlaceCandidate[] } | null>(null);

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

    function handleAdd(e: FormEvent) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        setChoices(null);
        void run(async () => {
            const places = await api.searchPlaces(trimmed);
            if (places.length === 0) throw new ApiError(404, `No se encontró ningún lugar para "${trimmed}"`);
            if (places.length > 1) {
                setChoices({ query: trimmed, places });
                return;
            }
            await saveDestination(trimmed, places[0]);
        });
    }

    function startEdit(d: Destination) {
        setEditingId(d.id);
        setEditName(d.name);
        setEditNote(d.note ?? "");
        setEditCategory(d.category ?? "");
    }

    function handleSaveEdit(e: FormEvent) {
        e.preventDefault();
        const name = editName.trim();
        if (editingId === null || !name) return;
        const id = editingId;
        setEditingId(null);
        void run(() => api.updateDestination(id, { name, note: editNote.trim(), category: editCategory }));
    }

    async function saveDestination(query: string, place: PlaceCandidate) {
        const created = await api.addDestination(query, place);
        setName("");
        setChoices(null);
        setFocused(created);
    }

    const visible = focused ? [focused] : destinations;

    return (
        <div className="page">
            <PageHeader
                title="Destinos"
                subtitle={data ? `${destinations.length} lugar${destinations.length === 1 ? "" : "es"} · compartidos con todos los usuarios` : "Compartidos con todos los usuarios"}
                actions={<RefreshButton onClick={refresh} loading={loading} disabled={busy} />}
            />

            {error && <Alert>{error}</Alert>}
            {actionError && <Alert>{actionError}</Alert>}

            <form className="card" onSubmit={handleAdd}>
                <div className="form-row" style={{ flexWrap: "nowrap" }}>
                    <div className="input-icon">
                        <Icon name="search" size={17} />
                        <input
                            className="input"
                            placeholder="Busca un lugar…"
                            aria-label="Nombre del destino"
                            enterKeyHint="search"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
                        {busy ? "Buscando…" : "Añadir"}
                    </button>
                </div>
            </form>

            {choices && (
                <div className="card flush">
                    <div className="group-label">¿Cuál es «{choices.query}»?</div>
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
                                    onClick={() => void run(() => saveDestination(choices.query, p))}
                                >
                                    Elegir
                                </button>
                            </div>
                        </div>
                    ))}
                    <div className="list-row">
                        <button className="btn btn-sm" onClick={() => setChoices(null)} disabled={busy}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            <div className="card map-card">
                <MapContainer center={[40.4168, -3.7038]} zoom={5} scrollWheelZoom={false}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FitToDestinations destinations={visible} />
                    {destinations.map((d) => (
                        <Marker key={d.id} position={[d.latitude, d.longitude]} icon={d.visited ? visitedIcon : defaultIcon}>
                            <Popup>
                                <strong>{d.name}</strong>
                                <br />
                                {d.displayName}
                                {(d.category || d.note) && (
                                    <>
                                        <br />
                                        {[d.category, d.note].filter(Boolean).join(" · ")}
                                    </>
                                )}
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            <div className="card flush">
                {data === null && loading ? (
                    <SkeletonRows rows={3} />
                ) : destinations.length === 0 ? (
                    <EmptyState icon="pin" title="Sin destinos todavía" text="Escribe el nombre de un lugar arriba y aparecerá en el mapa." />
                ) : (
                    destinations.map((d) =>
                        editingId === d.id ? (
                            <form key={d.id} className="list-row row-wrap" onSubmit={handleSaveEdit}>
                                <input
                                    className="input"
                                    aria-label={`Nombre de ${d.name}`}
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    autoFocus
                                />
                                <input
                                    className="input"
                                    aria-label="Nota"
                                    placeholder="Nota (opcional)"
                                    maxLength={500}
                                    value={editNote}
                                    onChange={(e) => setEditNote(e.target.value)}
                                />
                                <select
                                    className="select select-inline"
                                    aria-label="Categoría"
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                >
                                    <option value="">Sin categoría</option>
                                    {CATEGORIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <button type="submit" className="btn btn-ghost btn-sm icon-btn" disabled={busy || !editName.trim()} aria-label="Guardar cambios" title="Guardar">
                                    <Icon name="check" size={17} />
                                </button>
                                <button type="button" className="btn btn-ghost btn-sm icon-btn" onClick={() => setEditingId(null)} aria-label="Cancelar" title="Cancelar">
                                    <Icon name="close" size={17} />
                                </button>
                            </form>
                        ) : (
                            <div key={d.id} className={`list-row row-wrap${d.visited ? " is-checked" : ""}`}>
                                <input
                                    type="checkbox"
                                    className="check"
                                    checked={d.visited}
                                    disabled={busy}
                                    onChange={() => void run(() => api.updateDestination(d.id, { visited: !d.visited }))}
                                    aria-label={`Marcar ${d.name} como visitado`}
                                    title="Visitado"
                                />
                                <div className="row-main">
                                    <div className="row-title">{d.name}</div>
                                    <div className="row-sub">{d.displayName}</div>
                                    {(d.category || d.note) && (
                                        <div className="row-sub">
                                            {d.category && <span className="badge badge-accent">{d.category}</span>}
                                            {d.category && d.note ? " " : ""}
                                            {d.note}
                                        </div>
                                    )}
                                </div>
                                <div className="row-actions">
                                    <button
                                        className={`btn btn-sm${focused?.id === d.id ? " btn-primary" : ""}`}
                                        onClick={() => {
                                            setFocused(focused?.id === d.id ? null : d);
                                            window.scrollTo({ top: 0, behavior: "smooth" });
                                        }}
                                    >
                                        {focused?.id === d.id ? "Ver todos" : "Ver"}
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm icon-btn"
                                        disabled={busy}
                                        onClick={() => startEdit(d)}
                                        aria-label={`Editar ${d.name}`}
                                        title="Editar"
                                    >
                                        <Icon name="edit" size={17} />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm icon-btn"
                                        disabled={busy}
                                        onClick={() => {
                                            if (!window.confirm(`¿Eliminar el destino "${d.name}"?`)) return;
                                            if (focused?.id === d.id) setFocused(null);
                                            void run(() => api.deleteDestination(d.id));
                                        }}
                                        aria-label={`Eliminar ${d.name}`}
                                        title="Eliminar"
                                    >
                                        <Icon name="trash" size={17} />
                                    </button>
                                </div>
                            </div>
                        ),
                    )
                )}
            </div>
        </div>
    );
}
