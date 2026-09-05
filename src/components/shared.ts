import type { CSSProperties } from "react";

export const shared: Record<string, CSSProperties> = {
    page: { display: "flex", flexDirection: "column", gap: 16, padding: "20px 24px 40px" },
    headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
    pageTitle: { margin: 0, fontSize: 18, fontWeight: 500 },
    refreshButton: {
        background: "transparent",
        border: "1px solid var(--color-border)",
        color: "var(--color-text-secondary)",
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 13,
        cursor: "pointer",
    },
    card: {
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: 16,
    },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
    th: {
        textAlign: "left",
        padding: "8px 10px",
        color: "var(--color-text-secondary)",
        fontWeight: 500,
        borderBottom: "1px solid var(--color-border)",
        whiteSpace: "nowrap",
    },
    td: { padding: "8px 10px", borderBottom: "1px solid var(--color-border)", verticalAlign: "top" },
    empty: { color: "var(--color-text-secondary)", fontSize: 13, padding: "20px 0", textAlign: "center" },
    errorBox: {
        background: "rgba(224,138,138,0.12)",
        border: "1px solid var(--color-danger)",
        color: "var(--color-danger)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
    },
    select: {
        background: "var(--color-surface-alt)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "6px 10px",
        color: "var(--color-text)",
        fontSize: 13,
    },
    tag: {
        display: "inline-block",
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid var(--color-border)",
        color: "var(--color-text-secondary)",
    },
};

export function formatDate(epochMs: number): string {
    return new Date(epochMs).toLocaleString("es-ES");
}

export const levelColor: Record<string, string> = {
    ERROR: "var(--color-danger)",
    WARNING: "#e0c98a",
    INFO: "var(--color-text)",
    DEBUG: "var(--color-text-secondary)",
};
