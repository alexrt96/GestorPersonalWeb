import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";

interface PollingState<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
    refresh: () => void;
}

/** Carga datos, con refresco manual y polling ligero mientras la pestaña esté visible. */
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 30_000): PollingState<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    const load = useCallback(() => {
        setLoading(true);
        fetcherRef
            .current()
            .then((result) => {
                setData(result);
                setError(null);
            })
            .catch((err) => {
                setError(err instanceof ApiError ? err.message : "No se pudo conectar con la API");
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
        const id = setInterval(() => {
            if (document.visibilityState === "visible") load();
        }, intervalMs);
        // Al volver a la pestaña se refresca enseguida, sin esperar al siguiente intervalo (en segundo plano no hay polling).
        const onVisible = () => {
            if (document.visibilityState === "visible") load();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [load, intervalMs]);

    return { data, error, loading, refresh: load };
}
