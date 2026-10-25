export function formatDate(epochMs: number): string {
    return new Date(epochMs).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Hoy como "yyyy-MM-dd" en hora local (las fechas de vencimientos y viajes no llevan zona horaria). */
export function todayIso(): string {
    return toIso(new Date());
}

function toIso(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Fecha "yyyy-MM-dd" como Date local a medianoche. */
function parseIso(iso: string): Date {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
}

/** Días naturales desde hoy hasta [iso] (negativo si ya pasó). */
export function daysFromToday(iso: string): number {
    return Math.round((parseIso(iso).getTime() - parseIso(todayIso()).getTime()) / 86_400_000);
}

/** Días naturales entre dos fechas "yyyy-MM-dd" (b - a). */
export function daysBetween(a: string, b: string): number {
    return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86_400_000);
}

/** "sáb, 25 oct 2026". */
export function formatDay(iso: string): string {
    return parseIso(iso).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** "25 oct 2026 – 3 nov 2026" (o una sola fecha si coinciden). */
export function formatRange(startIso: string, endIso: string): string {
    const fmt = (iso: string) => parseIso(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
    return startIso === endIso ? fmt(startIso) : `${fmt(startIso)} – ${fmt(endIso)}`;
}

/** Clase de insignia (index.css) según el nivel de un log. */
export const levelBadge: Record<string, string> = {
    ERROR: "badge-danger",
    WARNING: "badge-warning",
    INFO: "badge-accent",
    DEBUG: "",
};
