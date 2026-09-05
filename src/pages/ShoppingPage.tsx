import { useState } from "react";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { ShoppingTemplateDetail } from "../api/types";
import { shared } from "../components/shared";

const CATEGORY_ORDER = ["Frescos", "Despensa", "Limpieza", "Bebidas", "Otros"];

function groupByCategory<T extends { category: string | null }>(items: T[]): [string, T[]][] {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        const key = item.category ?? "Sin categoría";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
    }
    return [...groups.entries()].sort((a, b) => {
        const ia = CATEGORY_ORDER.indexOf(a[0]);
        const ib = CATEGORY_ORDER.indexOf(b[0]);
        if (ia === -1 && ib === -1) return a[0].localeCompare(b[0]);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}

export function ShoppingPage() {
    const items = usePolling(api.shoppingItems, 20_000);
    const templates = usePolling(api.shoppingTemplates, 20_000);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [detail, setDetail] = useState<ShoppingTemplateDetail | null>(null);

    async function toggleExpand(id: number) {
        if (expanded === id) {
            setExpanded(null);
            setDetail(null);
            return;
        }
        setExpanded(id);
        setDetail(null);
        try {
            setDetail(await api.shoppingTemplateDetail(id));
        } catch {
            setDetail(null);
        }
    }

    const grouped = groupByCategory(items.data ?? []);
    const checkedCount = (items.data ?? []).filter((i) => i.checked).length;

    return (
        <div style={shared.page}>
            <div style={shared.headerRow}>
                <h1 style={shared.pageTitle}>Lista de la compra</h1>
                <button style={shared.refreshButton} onClick={() => { items.refresh(); templates.refresh(); }} disabled={items.loading}>
                    {items.loading ? "Actualizando…" : "Actualizar"}
                </button>
            </div>

            {items.error && <div style={shared.errorBox}>{items.error}</div>}

            <div style={shared.card}>
                <div style={{ marginBottom: 8, color: "var(--color-text-secondary)", fontSize: 13 }}>
                    {items.data?.length ?? 0} artículos · {checkedCount} marcados
                </div>
                {grouped.map(([category, categoryItems]) => (
                    <div key={category} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                            {category}
                        </div>
                        {categoryItems.map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    padding: "6px 0",
                                    borderBottom: "1px solid var(--color-border)",
                                    opacity: item.checked ? 0.5 : 1,
                                    textDecoration: item.checked ? "line-through" : "none",
                                    fontSize: 14,
                                }}
                            >
                                <span>{item.name}</span>
                                <span style={{ color: "var(--color-text-secondary)" }}>x{item.quantity}</span>
                            </div>
                        ))}
                    </div>
                ))}
                {items.data !== null && items.data.length === 0 && <div style={shared.empty}>La lista está vacía.</div>}
            </div>

            <div style={shared.card}>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>Plantillas</div>
                {(templates.data ?? []).map((t) => (
                    <div key={t.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <div
                            style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", cursor: "pointer", fontSize: 14 }}
                            onClick={() => toggleExpand(t.id)}
                        >
                            <span>{t.name}</span>
                            <span style={{ color: "var(--color-text-secondary)" }}>{t.itemCount} items</span>
                        </div>
                        {expanded === t.id && (
                            <div style={{ padding: "0 0 10px 12px", fontSize: 13, color: "var(--color-text-secondary)" }}>
                                {detail ? detail.items.map((i, idx) => <div key={idx}>{i.name} x{i.quantity}</div>) : "Cargando…"}
                            </div>
                        )}
                    </div>
                ))}
                {templates.data !== null && templates.data.length === 0 && <div style={shared.empty}>No hay plantillas guardadas.</div>}
            </div>
        </div>
    );
}
