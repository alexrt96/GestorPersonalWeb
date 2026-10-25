import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { api, ApiError } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { Destination } from "../api/types";
import { Alert, EmptyState, PageHeader, RefreshButton, SkeletonRows } from "../components/ui";
import { Icon } from "../components/Icon";

const defaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
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
        void run(async () => {
            const created = await api.addDestination(trimmed);
            setName("");
            setFocused(created);
        });
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

            <div className="card map-card">
                <MapContainer center={[40.4168, -3.7038]} zoom={5} scrollWheelZoom={false}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FitToDestinations destinations={visible} />
                    {destinations.map((d) => (
                        <Marker key={d.id} position={[d.latitude, d.longitude]} icon={defaultIcon}>
                            <Popup>
                                <strong>{d.name}</strong>
                                <br />
                                {d.displayName}
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
                    destinations.map((d) => (
                        <div key={d.id} className="list-row row-wrap">
                            <span className="row-icon">
                                <Icon name="pin" />
                            </span>
                            <div className="row-main">
                                <div className="row-title">{d.name}</div>
                                <div className="row-sub">{d.displayName}</div>
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
                    ))
                )}
            </div>
        </div>
    );
}
