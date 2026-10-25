import { useMemo, useSyncExternalStore } from "react";

/**
 * Navegación por URL con el hash (`#/trips/2/stops/17`): cada pantalla tiene su dirección, así que el botón atrás
 * del navegador, recargar y compartir el enlace funcionan. Se usa el hash y no rutas "limpias" porque así no hace
 * falta configurar redirecciones en el hosting estático.
 */
function subscribe(callback: () => void): () => void {
    window.addEventListener("hashchange", callback);
    return () => window.removeEventListener("hashchange", callback);
}

const getHash = () => window.location.hash;

export function parseRoute(hash: string): string[] {
    return hash
        .replace(/^#\/?/, "")
        .split("/")
        .filter(Boolean)
        .map((segment) => {
            try {
                return decodeURIComponent(segment);
            } catch {
                return segment;
            }
        });
}

/** Segmentos de la ruta actual: `#/trips/2/stops/17` → `["trips", "2", "stops", "17"]`. */
export function useRoute(): string[] {
    const hash = useSyncExternalStore(subscribe, getHash, () => "");
    return useMemo(() => parseRoute(hash), [hash]);
}

/**
 * Va a `path` (empieza por "/"). Por defecto añade una entrada al historial, así "atrás" vuelve a la pantalla
 * anterior; con `replace` sustituye la actual (para correcciones de ruta y para pasar entre paradas vecinas).
 */
export function navigate(path: string, replace = false): void {
    const hash = `#${path}`;
    if (window.location.hash === hash) return;
    if (replace) {
        // replaceState no dispara "hashchange": se avisa a mano para que useRoute se entere.
        window.history.replaceState(null, "", hash);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
        window.location.hash = hash;
    }
}

/** Identificador numérico de un segmento de ruta, o null si no lo es. */
export function routeId(segment: string | undefined): number | null {
    return segment !== undefined && /^\d+$/.test(segment) ? Number(segment) : null;
}
