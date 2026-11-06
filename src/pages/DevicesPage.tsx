import { useRef, useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatDate } from "../components/shared";
import { EmptyState, PageHeader, RefreshButton, Alert, SkeletonRows } from "../components/ui";
import { Icon } from "../components/Icon";
import { MapView } from "../components/MapView";
import type { MapPoint } from "../components/MapView";

export function DevicesPage() {
    const { data: devices, error, loading, refresh } = usePolling(api.devices, 20_000);
    // Dispositivo seleccionado: el mapa vuela hasta su punto y la fila queda resaltada.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const list = devices ?? [];
    const located = list.filter((d) => d.point !== null);
    const points: MapPoint[] = located.map((d) => ({
        id: d.id,
        lat: d.point!.latitude,
        lng: d.point!.longitude,
        popup: (
            <div className="map-popup">
                <strong>{d.name}</strong>
                <span>Guardado {formatDate(d.point!.timestamp)}</span>
            </div>
        ),
    }));

    function select(id: string) {
        setSelectedId(id);
        const rect = mapRef.current?.getBoundingClientRect();
        if (rect && (rect.top < 0 || rect.bottom > window.innerHeight)) {
            mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    return (
        <div className="page">
            <PageHeader
                title="Dispositivos Bluetooth"
                subtitle={devices ? `${list.length} dispositivo${list.length === 1 ? "" : "s"} · ${located.length} con ubicación` : undefined}
                actions={<RefreshButton onClick={refresh} loading={loading} />}
            />

            {error && <Alert>{error}</Alert>}

            <div className="card map-card" ref={mapRef}>
                <MapView points={points} selectedId={selectedId} onSelect={(id) => setSelectedId(id as string | null)} fitMaxZoom={15} focusZoom={16} />
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
                        <div key={d.id} className={`list-row row-wrap${selectedId === d.id ? " is-selected" : ""}`}>
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
                                            className={`btn btn-sm${selectedId === d.id ? " btn-primary" : ""}`}
                                            onClick={() => (selectedId === d.id ? setSelectedId(null) : select(d.id))}
                                        >
                                            <Icon name="pin" size={15} />
                                            {selectedId === d.id ? "Ver todos" : "Ver"}
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
