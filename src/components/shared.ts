export function formatDate(epochMs: number): string {
    return new Date(epochMs).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Clase de insignia (index.css) según el nivel de un log. */
export const levelBadge: Record<string, string> = {
    ERROR: "badge-danger",
    WARNING: "badge-warning",
    INFO: "badge-accent",
    DEBUG: "",
};
