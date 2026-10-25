import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import type { TripDetail, TripStop } from "../api/types";
import { EmptyState, PageHeader } from "../components/ui";
import { Icon } from "../components/Icon";
import { daysBetween, formatDay } from "../components/shared";

const stopIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

/** Centra el mapa en la parada cada vez que cambia. */
function CenterOn({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], 15);
    }, [lat, lng, map]);
    return null;
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="stop-detail-row">
            <span className="stop-detail-label">{label}</span>
            <span>{value}</span>
        </div>
    );
}

/** Parada anterior o siguiente; sin parada vecina el botón se muestra apagado. */
function Neighbour({ label, stop, onOpen }: { label: string; stop: TripStop | undefined; onOpen: (id: number) => void }) {
    return (
        <button className="stop-neighbour" disabled={!stop} onClick={() => stop && onOpen(stop.id)}>
            <span className="stop-neighbour-label">{label}</span>
            <span className="stop-neighbour-title">{stop ? `${stop.time ? `${stop.time} · ` : ""}${stop.title}` : "—"}</span>
        </button>
    );
}

/** Pantalla de una parada del itinerario: mapa con el punto, "cómo llegar", detalle completo y paradas vecinas. */
export function TripStopView({
    trip,
    stop,
    onBack,
    onOpen,
}: {
    trip: TripDetail;
    stop: TripStop | undefined;
    onBack: () => void;
    onOpen: (stopId: number) => void;
}) {
    const backButton = (
        <button className="btn btn-sm" onClick={onBack}>
            <Icon name="chevronLeft" size={16} />
            {trip.name}
        </button>
    );

    // La parada se borró (desde otro dispositivo) mientras estaba abierta.
    if (!stop) {
        return (
            <div className="page">
                <PageHeader title="Parada" actions={backButton} />
                <EmptyState icon="pin" title="Esta parada ya no existe" text="Alguien la ha eliminado." />
            </div>
        );
    }

    const index = trip.stops.findIndex((s) => s.id === stop.id);
    const dayNumber = daysBetween(trip.startDate, stop.day) + 1;
    // typeof y no "!== null": una parada sin las claves (API antigua) tampoco tiene ubicación.
    const lat = typeof stop.latitude === "number" ? stop.latitude : null;
    const lng = typeof stop.longitude === "number" ? stop.longitude : null;
    const needsReservation = stop.note?.startsWith("RESERVA") ?? false;

    return (
        <div className="page">
            <PageHeader
                title={stop.title}
                subtitle={`${dayNumber >= 1 ? `Día ${dayNumber} · ` : ""}${formatDay(stop.day)}${stop.time ? ` · ${stop.time}` : ""}`}
                actions={backButton}
            />

            {needsReservation && (
                <div>
                    <span className="badge badge-accent">RESERVA NECESARIA</span>
                </div>
            )}

            <div className="card map-card">
                {lat !== null && lng !== null ? (
                    <MapContainer key={stop.id} center={[lat, lng]} zoom={15} scrollWheelZoom={false}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <CenterOn lat={lat} lng={lng} />
                        <Marker position={[lat, lng]} icon={stopIcon}>
                            <Popup>
                                <strong>{stop.title}</strong>
                                {stop.place && (
                                    <>
                                        <br />
                                        {stop.place}
                                    </>
                                )}
                            </Popup>
                        </Marker>
                    </MapContainer>
                ) : (
                    <EmptyState icon="pin" title="Sin ubicación en el mapa" text="Edita la parada y escribe el lugar (con la ciudad) para situarla." />
                )}
            </div>

            <div>
                {lat !== null && lng !== null ? (
                    <a
                        className="btn btn-primary"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Icon name="pin" size={16} />
                        Cómo llegar a pie
                    </a>
                ) : (
                    stop.place && (
                        <a
                            className="btn"
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.place)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Icon name="search" size={16} />
                            Buscar «{stop.place}» en Google Maps
                        </a>
                    )
                )}
            </div>

            <section>
                <h2 className="card-title">Detalles</h2>
                <div className="card">
                    <Detail label="Día" value={formatDay(stop.day)} />
                    <Detail label="Hora" value={stop.time ?? "Sin hora"} />
                    {stop.place && <Detail label="Lugar" value={stop.place} />}
                    <Detail label="Viaje" value={trip.name} />
                    <Detail label="Parada" value={`${index + 1} de ${trip.stops.length}`} />
                </div>
            </section>

            {stop.note && (
                <section>
                    <h2 className="card-title">Nota</h2>
                    <div className="card stop-note">{stop.note}</div>
                </section>
            )}

            <div className="stop-neighbours">
                <Neighbour label="← Anterior" stop={trip.stops[index - 1]} onOpen={onOpen} />
                <Neighbour label="Siguiente →" stop={trip.stops[index + 1]} onOpen={onOpen} />
            </div>
        </div>
    );
}
