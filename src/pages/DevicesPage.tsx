import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { Device } from "../api/types";
import { formatDate } from "../components/shared";
import { EmptyState, PageHeader, RefreshButton, Alert, SkeletonRows } from "../components/ui";
import { Icon } from "../components/Icon";

const defaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

/** Reencuadra el mapa sobre los dispositivos indicados cuando cambian. */
function FitTo({ devices }: { devices: Device[] }) {
    const map = useMap();
    useEffect(() => {
        if (devices.length === 0) return;
        const bounds = L.latLngBounds(devices.map((d) => [d.point!.latitude, d.point!.longitude] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }, [devices, map]);
    return null;
}

export function DevicesPage() {
    const { data: devices, error, loading, refresh } = usePolling(api.devices, 20_000);
    const [focused, setFocused] = useState<Device | null>(null);
    const list = devices ?? [];
    const located = list.filter((d) => d.point !== null);

    return (
        <div className="page">
            <PageHeader
                title="Dispositivos Bluetooth"
                subtitle={devices ? `${list.length} dispositivo${list.length === 1 ? "" : "s"} · ${located.length} con ubicación` : undefined}
                actions={<RefreshButton onClick={refresh} loading={loading} />}
            />

            {error && <Alert>{error}</Alert>}

            <div className="card map-card">
                <MapContainer center={[40.4168, -3.7038]} zoom={5} scrollWheelZoom={false}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FitTo devices={focused?.point ? [focused] : located} />
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

            <div className="card flush">
                {devices === null && loading ? (
                    <SkeletonRows rows={3} />
                ) : list.length === 0 ? (
                    <EmptyState
                        icon="bluetooth"
                        title="Aún no hay dispositivos"
                        text="Añade un dispositivo Bluetooth desde la app del móvil y su última ubicación aparecerá aquí."
                    />
                ) : (
                    list.map((d) => (
                        <div key={d.id} className="list-row row-wrap">
                            <span className="row-icon">
                                <Icon name="bluetooth" />
                            </span>
                            <div className="row-main">
                                <div className="row-title">{d.name}</div>
                                <div className="row-sub">
                                    {d.id} · añadido {formatDate(d.createdAt)}
                                </div>
                            </div>
                            <div className="row-actions">
                                {d.point ? (
                                    <>
                                        <span className="badge badge-success">{formatDate(d.point.timestamp)}</span>
                                        <button
                                            className="btn btn-sm"
                                            onClick={() => {
                                                setFocused(focused?.id === d.id ? null : d);
                                                window.scrollTo({ top: 0, behavior: "smooth" });
                                            }}
                                        >
                                            <Icon name="pin" size={15} />
                                            {focused?.id === d.id ? "Todos" : "Ver"}
                                        </button>
                                    </>
                                ) : (
                                    <span className="badge">Sin ubicación</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
