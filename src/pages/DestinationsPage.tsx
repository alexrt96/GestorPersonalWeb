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
import { formatDate, shared } from "../components/shared";

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
        <div style={shared.page}>
            <div style={shared.headerRow}>
                <h1 style={shared.pageTitle}>Destinos</h1>
                <button style={shared.refreshButton} onClick={refresh} disabled={loading || busy}>
                    {loading ? "Actualizando…" : "Actualizar"}
                </button>
            </div>

            {error && <div style={shared.errorBox}>{error}</div>}
            {actionError && <div style={shared.errorBox}>{actionError}</div>}

            <div style={shared.card}>
                <form onSubmit={handleAdd} style={{ display: "flex", gap: 8 }}>
                    <input
                        style={{ ...shared.input, flex: 1 }}
                        placeholder="Nombre del destino (ej. Torre Eiffel, Calle Mayor 1 Madrid…)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <button type="submit" style={shared.accentButton} disabled={busy || !name.trim()}>
                        {busy ? "Buscando…" : "Añadir"}
                    </button>
                </form>
            </div>

            <div style={{ ...shared.card, padding: 0, overflow: "hidden", height: "min(420px, 60vh)" }}>
                <MapContainer center={[40.4168, -3.7038]} zoom={5} style={{ height: "100%", width: "100%" }}>
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

            <div style={shared.card}>
                <table style={shared.table}>
                    <thead>
                        <tr>
                            <th style={shared.th}>Nombre</th>
                            <th style={shared.th}>Ubicación</th>
                            <th style={shared.th}>Añadido</th>
                            <th style={shared.th}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {destinations.map((d) => (
                            <tr key={d.id}>
                                <td style={shared.td}>{d.name}</td>
                                <td style={{ ...shared.td, color: "var(--color-text-secondary)" }}>{d.displayName}</td>
                                <td style={shared.td}>{formatDate(d.createdAt)}</td>
                                <td style={{ ...shared.td, whiteSpace: "nowrap" }}>
                                    <button style={shared.smallButton} onClick={() => setFocused(focused?.id === d.id ? null : d)}>
                                        {focused?.id === d.id ? "Ver todos" : "Ver en mapa"}
                                    </button>{" "}
                                    <button
                                        style={{ ...shared.smallButton, color: "var(--color-danger)" }}
                                        disabled={busy}
                                        onClick={() => {
                                            if (!window.confirm(`¿Eliminar el destino "${d.name}"?`)) return;
                                            if (focused?.id === d.id) setFocused(null);
                                            void run(() => api.deleteDestination(d.id));
                                        }}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data !== null && destinations.length === 0 && <div style={shared.empty}>No hay destinos guardados todavía.</div>}
            </div>
        </div>
    );
}
