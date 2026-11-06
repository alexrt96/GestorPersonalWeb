import { useEffect, useMemo, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Un punto del mapa. `tone` colorea el pin (acento por defecto, verde para "visitado"). */
export type MapPoint = {
    id: number | string;
    lat: number;
    lng: number;
    tone?: "accent" | "success";
    popup?: ReactNode;
    /** Texto corto dentro del pin (p. ej. el número de parada del día) en vez del punto blanco. */
    label?: string;
};

const DEFAULT_CENTER: [number, number] = [40.4168, -3.7038];

/** Pin propio en SVG (mismo dibujo para todos los mapas); el color y el tamaño los pone el CSS (.map-pin). */
const PIN_SVG =
    '<svg viewBox="0 0 32 42" aria-hidden="true"><path class="map-pin-body" d="M16 41s13-12.3 13-24.5A13 13 0 0 0 3 16.5C3 28.7 16 41 16 41z"/><circle class="map-pin-dot" cx="16" cy="16.5" r="5"/></svg>';

/** Pin con un número (o texto corto) en la cabeza en vez del punto. */
function labelledPinSvg(label: string): string {
    const safe = label.replace(/[^0-9A-Za-z]/g, "").slice(0, 3);
    const size = safe.length > 2 ? 9 : 12;
    return `<svg viewBox="0 0 32 42" aria-hidden="true"><path class="map-pin-body" d="M16 41s13-12.3 13-24.5A13 13 0 0 0 3 16.5C3 28.7 16 41 16 41z"/><circle class="map-pin-dot" cx="16" cy="16.5" r="8.5"/><text class="map-pin-label" x="16" y="16.5" font-size="${size}" text-anchor="middle" dominant-baseline="central">${safe}</text></svg>`;
}

const iconCache = new Map<string, L.DivIcon>();

function pinIcon(tone: "accent" | "success", selected: boolean, label?: string): L.DivIcon {
    const key = `${tone}-${selected}-${label ?? ""}`;
    let icon = iconCache.get(key);
    if (!icon) {
        const size: [number, number] = selected ? [38, 50] : [30, 40];
        icon = L.divIcon({
            className: `map-pin map-pin--${tone}${selected ? " is-selected" : ""}`,
            html: label ? labelledPinSvg(label) : PIN_SVG,
            iconSize: size,
            iconAnchor: [size[0] / 2, size[1]],
            popupAnchor: [0, -size[1] + 4],
        });
        iconCache.set(key, icon);
    }
    return icon;
}

function prefersReducedMotion(): boolean {
    return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Mueve la cámara solo cuando hace falta: al cambiar el conjunto de puntos o la selección. Así el refresco
 * periódico (o editar una nota) no deshace el zoom o el desplazamiento que haya hecho el usuario.
 * - Con un punto seleccionado: vuela hasta él y abre su globo.
 * - Sin selección: encuadra todos los puntos.
 * La primera vez se coloca sin animación (no tiene sentido "volar" desde la vista de España).
 */
function CameraController({
    points,
    selectedId,
    markers,
    fitMaxZoom,
    focusZoom,
}: {
    points: MapPoint[];
    selectedId: MapPoint["id"] | null;
    markers: RefObject<Map<MapPoint["id"], L.Marker>>;
    fitMaxZoom: number;
    focusZoom: number;
}) {
    const map = useMap();
    const first = useRef(true);
    const pointsKey = points.map((p) => `${p.id}:${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");

    useEffect(() => {
        if (points.length === 0) return;
        const animate = !first.current && !prefersReducedMotion();
        first.current = false;
        const selected = selectedId === null ? undefined : points.find((p) => p.id === selectedId);

        if (selected) {
            const zoom = Math.max(map.getZoom(), focusZoom);
            if (animate) map.flyTo([selected.lat, selected.lng], zoom, { duration: 0.8 });
            else map.setView([selected.lat, selected.lng], zoom, { animate: false });
            // El globo se abre al terminar el vuelo, para que no lo cierre el propio movimiento.
            const open = () => markers.current?.get(selected.id)?.openPopup();
            if (animate) map.once("moveend", open);
            else open();
            return () => {
                map.off("moveend", open);
            };
        }

        map.closePopup();
        if (points.length === 1) {
            const p = points[0];
            if (animate) map.flyTo([p.lat, p.lng], fitMaxZoom, { duration: 0.8 });
            else map.setView([p.lat, p.lng], fitMaxZoom, { animate: false });
        } else {
            const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
            if (animate) map.flyToBounds(bounds, { padding: [48, 48], maxZoom: fitMaxZoom, duration: 0.8 });
            else map.fitBounds(bounds, { padding: [48, 48], maxZoom: fitMaxZoom, animate: false });
        }
        // pointsKey resume `points`: no se vuelve a mover por recibir un array nuevo con lo mismo.
        // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [pointsKey, selectedId, map, fitMaxZoom, focusZoom]);

    return null;
}

/** La rueda del ratón solo hace zoom tras pulsar el mapa (si no, al bajar por la página el mapa "atrapa" el scroll). */
function WheelZoomOnFocus() {
    const map = useMap();
    useEffect(() => {
        const enable = () => map.scrollWheelZoom.enable();
        const disable = () => map.scrollWheelZoom.disable();
        map.on("click", enable);
        map.on("mouseout", disable);
        return () => {
            map.off("click", enable);
            map.off("mouseout", disable);
        };
    }, [map]);
    return null;
}

/** Botón flotante "Ver todos" (encima del mapa, abajo a la izquierda). */
function FitAllButton({ points, fitMaxZoom, onClick }: { points: MapPoint[]; fitMaxZoom: number; onClick?: () => void }) {
    const map = useMap();
    const ref = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        // Que pulsar el botón no cuente como pulsar el mapa (ni active el zoom con la rueda).
        if (ref.current) {
            L.DomEvent.disableClickPropagation(ref.current);
            L.DomEvent.disableScrollPropagation(ref.current);
        }
    }, []);
    if (points.length < 2) return null;
    return (
        <button
            ref={ref}
            type="button"
            className="map-fab"
            onClick={() => {
                onClick?.();
                const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
                map.closePopup();
                map.flyToBounds(bounds, { padding: [48, 48], maxZoom: fitMaxZoom, duration: prefersReducedMotion() ? 0 : 0.8 });
            }}
        >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
            Ver todos
        </button>
    );
}

/**
 * Mapa común de la web (Leaflet): teselas de OpenStreetMap en modo oscuro, pines propios con el color de la app,
 * cámara animada y selección enlazada con la lista de la página.
 */
export function MapView({
    points,
    selectedId = null,
    onSelect,
    fitMaxZoom = 13,
    focusZoom = 15,
    interactive = true,
    route = false,
}: {
    points: MapPoint[];
    selectedId?: MapPoint["id"] | null;
    /** Pulsar un pin lo selecciona; "Ver todos" quita la selección (null). */
    onSelect?: (id: MapPoint["id"] | null) => void;
    fitMaxZoom?: number;
    focusZoom?: number;
    /** false: sin botón "Ver todos" (mapas de un solo punto). */
    interactive?: boolean;
    /** Une los puntos con una línea discontinua en el orden recibido (recorrido de un día de viaje). */
    route?: boolean;
}) {
    const markers = useRef(new Map<MapPoint["id"], L.Marker>());
    // El pin seleccionado se dibuja el último para que quede por encima de los demás.
    const ordered = useMemo(
        () => [...points].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId)),
        [points, selectedId],
    );

    return (
        <MapContainer center={DEFAULT_CENTER} zoom={5} scrollWheelZoom={false} zoomSnap={0.5}>
            {/* Teselas de OpenStreetMap oscurecidas por CSS (.map-tiles-dark): los estilos oscuros "de verdad" sin
                clave (p. ej. CARTO) ya no se sirven sin API key. */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles-dark"
                maxZoom={19}
            />
            <CameraController points={points} selectedId={selectedId} markers={markers} fitMaxZoom={fitMaxZoom} focusZoom={focusZoom} />
            <WheelZoomOnFocus />
            {route && points.length > 1 && (
                <Polyline
                    positions={points.map((p) => [p.lat, p.lng] as [number, number])}
                    pathOptions={{ className: "map-route", color: "#b4a9f5", weight: 2.5, opacity: 0.75, dashArray: "6 7" }}
                />
            )}
            {interactive && <FitAllButton points={points} fitMaxZoom={fitMaxZoom} onClick={() => onSelect?.(null)} />}
            {ordered.map((p) => (
                <Marker
                    key={p.id}
                    position={[p.lat, p.lng]}
                    icon={pinIcon(p.tone ?? "accent", p.id === selectedId, p.label)}
                    zIndexOffset={p.id === selectedId ? 1000 : 0}
                    ref={(m) => {
                        if (m) markers.current.set(p.id, m);
                        else markers.current.delete(p.id);
                    }}
                    eventHandlers={onSelect ? { click: () => onSelect(p.id) } : undefined}
                >
                    {p.popup && <Popup>{p.popup}</Popup>}
                </Marker>
            ))}
        </MapContainer>
    );
}
