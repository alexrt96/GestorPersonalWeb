import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { Destination, PlaceCandidate } from "../api/types";
import { Alert, EmptyState, PageHeader, RefreshButton, SkeletonRows } from "../components/ui";
import { Icon } from "../components/Icon";
import { MapView } from "../components/MapView";
import type { MapPoint } from "../components/MapView";
import { useConfirm } from "../components/ConfirmDialog";

/** Categorías que se pueden asignar a un destino (la API guarda el texto tal cual). */
const CATEGORIES = ["Restaurante", "Viaje", "Ocio", "Compras", "Otros"];

export function DestinationsPage() {
    const { data, error, loading, refresh } = usePolling(api.destinations, 30_000);
    const destinations = data ?? [];
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    // Destino seleccionado: el mapa vuela hasta él y abre su globo; la fila queda resaltada.
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const [confirmDialog, confirm] = useConfirm();
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
        setSelectedId(created.id);
    }

    function select(id: number) {
        setSelectedId(id);
        // Si el mapa no se ve entero (lista larga), se sube hasta él.
        const rect = mapRef.current?.getBoundingClientRect();
        if (rect && (rect.top < 0 || rect.bottom > window.innerHeight)) {
            mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    const points: MapPoint[] = destinations.map((d) => ({
        id: d.id,
        lat: d.latitude,
        lng: d.longitude,
        tone: d.visited ? "success" : "accent",
        popup: (
            <div className="map-popup">
                <strong>{d.name}</strong>
                <span>{d.displayName}</span>
                {(d.category || d.note) && <span className="map-popup-meta">{[d.category, d.note].filter(Boolean).join(" · ")}</span>}
                {d.visited && <span className="badge badge-success">Visitado</span>}
            </div>
        ),
    }));

    return (
        <div className="page">
            <PageHeader
                title="Destinos"
                subtitle={data ? `${destinations.length} lugar${destinations.length === 1 ? "" : "es"} · compartidos con todos los usuarios` : "Compartidos con todos los usuarios"}
                actions={<RefreshButton onClick={refresh} loading={loading} disabled={busy} />}
            />

            {confirmDialog}
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

            <div className="card map-card" ref={mapRef}>
                <MapView points={points} selectedId={selectedId} onSelect={(id) => setSelectedId(id as number | null)} />
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
                            <div
                                key={d.id}
                                className={`list-row row-wrap${d.visited ? " is-checked" : ""}${selectedId === d.id ? " is-selected" : ""}`}
                            >
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
                                        className={`btn btn-sm${selectedId === d.id ? " btn-primary" : ""}`}
                                        onClick={() => (selectedId === d.id ? setSelectedId(null) : select(d.id))}
                                    >
                                        <Icon name="pin" size={15} />
                                        {selectedId === d.id ? "Ver todos" : "Ver"}
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
                                        onClick={async () => {
                                            const ok = await confirm({
                                                title: `¿Eliminar «${d.name}»?`,
                                                body: "Se quita de la lista y del mapa para todos los usuarios.",
                                                confirmLabel: "Eliminar",
                                                destructive: true,
                                            });
                                            if (!ok) return;
                                            if (selectedId === d.id) setSelectedId(null);
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
