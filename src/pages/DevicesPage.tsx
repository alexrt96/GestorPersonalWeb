import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatDate, shared } from "../components/shared";

const defaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

export function DevicesPage() {
    const { data: devices, error, loading, refresh } = usePolling(api.devices, 20_000);
    const located = (devices ?? []).filter((d) => d.point !== null);
    const center: [number, number] = located.length > 0
        ? [located[0].point!.latitude, located[0].point!.longitude]
        : [40.4168, -3.7038];

    return (
        <div style={shared.page}>
            <div style={shared.headerRow}>
                <h1 style={shared.pageTitle}>Dispositivos Bluetooth</h1>
                <button style={shared.refreshButton} onClick={refresh} disabled={loading}>
                    {loading ? "Actualizando…" : "Actualizar"}
                </button>
            </div>

            {error && <div style={shared.errorBox}>{error}</div>}

            <div style={{ ...shared.card, padding: 0, overflow: "hidden", height: 380 }}>
                <MapContainer center={center} zoom={located.length > 0 ? 12 : 5} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {located.map((d) => (
                        <Marker key={d.id} position={[d.point!.latitude, d.point!.longitude]} icon={defaultIcon}>
                            <Popup>
                                <strong>{d.name}</strong>
                                <br />
                                {formatDate(d.point!.timestamp)}
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
                            <th style={shared.th}>MAC</th>
                            <th style={shared.th}>Añadido</th>
                            <th style={shared.th}>Última posición</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(devices ?? []).map((d) => (
                            <tr key={d.id}>
                                <td style={shared.td}>{d.name}</td>
                                <td style={shared.td}>{d.id}</td>
                                <td style={shared.td}>{formatDate(d.createdAt)}</td>
                                <td style={shared.td}>
                                    {d.point ? formatDate(d.point.timestamp) : "Sin ubicación"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {devices !== null && devices.length === 0 && <div style={shared.empty}>No hay dispositivos añadidos todavía.</div>}
            </div>
        </div>
    );
}
