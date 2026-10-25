import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api/client";
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

    const [newName, setNewName] = useState("");
    const [newQuantity, setNewQuantity] = useState(1);
    const [newCategory, setNewCategory] = useState("");
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    /** Ejecuta una escritura contra la API, muestra su error si falla y refresca los datos. */
    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setActionError(null);
        try {
            await action();
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : "No se pudo conectar con la API");
        } finally {
            setBusy(false);
            items.refresh();
            templates.refresh();
        }
    }

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

    function handleAdd(e: FormEvent) {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;
        void run(async () => {
            await api.addShoppingItem({ name, quantity: Math.max(1, newQuantity), category: newCategory || null });
            setNewName("");
            setNewQuantity(1);
        });
    }

    function handleSaveTemplate() {
        const current = items.data ?? [];
        if (current.length === 0) return;
        const name = window.prompt("Nombre de la plantilla (se guardará con la lista actual):")?.trim();
        if (!name) return;
        void run(() => api.createShoppingTemplate(name, current.map((i) => ({ name: i.name, quantity: i.quantity }))));
    }

    function handleDeleteTemplate(id: number, name: string) {
        if (!window.confirm(`¿Eliminar la plantilla "${name}"?`)) return;
        void run(async () => {
            await api.deleteShoppingTemplate(id);
            if (expanded === id) {
                setExpanded(null);
                setDetail(null);
            }
        });
    }

    const grouped = groupByCategory(items.data ?? []);
    const checkedCount = (items.data ?? []).filter((i) => i.checked).length;

    return (
        <div style={shared.page}>
            <div style={shared.headerRow}>
                <h1 style={shared.pageTitle}>Lista de la compra</h1>
                <button style={shared.refreshButton} onClick={() => { items.refresh(); templates.refresh(); }} disabled={items.loading || busy}>
                    {items.loading ? "Actualizando…" : "Actualizar"}
                </button>
            </div>

            {items.error && <div style={shared.errorBox}>{items.error}</div>}
            {actionError && <div style={shared.errorBox}>{actionError}</div>}

            <div style={shared.card}>
                <form onSubmit={handleAdd} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    <input
                        style={{ ...shared.input, flex: "1 1 180px" }}
                        placeholder="Añadir artículo…"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <input
                        style={{ ...shared.input, width: 64 }}
                        type="number"
                        min={1}
                        aria-label="Cantidad"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(Math.max(1, Number(e.target.value) || 1))}
                    />
                    <select style={shared.select} aria-label="Categoría" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                        <option value="">Sin categoría</option>
                        {CATEGORY_ORDER.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <button type="submit" style={shared.accentButton} disabled={busy || !newName.trim()}>
                        Añadir
                    </button>
                </form>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                        {items.data?.length ?? 0} artículos · {checkedCount} marcados
                    </span>
                    <span style={{ display: "flex", gap: 8 }}>
                        <button style={shared.smallButton} onClick={handleSaveTemplate} disabled={busy || (items.data?.length ?? 0) === 0}>
                            Guardar como plantilla
                        </button>
                        <button
                            style={shared.smallButton}
                            onClick={() => void run(() => api.clearCheckedShoppingItems())}
                            disabled={busy || checkedCount === 0}
                        >
                            Quitar marcados
                        </button>
                    </span>
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
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "6px 0",
                                    borderBottom: "1px solid var(--color-border)",
                                    fontSize: 14,
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={item.checked}
                                    disabled={busy}
                                    onChange={() => void run(() => api.patchShoppingItem(item.id, { checked: !item.checked }))}
                                    aria-label={`Marcar ${item.name}`}
                                />
                                <span
                                    style={{
                                        flex: 1,
                                        opacity: item.checked ? 0.5 : 1,
                                        textDecoration: item.checked ? "line-through" : "none",
                                    }}
                                >
                                    {item.name}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)" }}>
                                    <button
                                        style={shared.smallButton}
                                        disabled={busy || item.quantity <= 1}
                                        onClick={() => void run(() => api.patchShoppingItem(item.id, { quantity: item.quantity - 1 }))}
                                        aria-label={`Reducir cantidad de ${item.name}`}
                                    >
                                        −
                                    </button>
                                    <span style={{ minWidth: 28, textAlign: "center" }}>x{item.quantity}</span>
                                    <button
                                        style={shared.smallButton}
                                        disabled={busy}
                                        onClick={() => void run(() => api.patchShoppingItem(item.id, { quantity: item.quantity + 1 }))}
                                        aria-label={`Aumentar cantidad de ${item.name}`}
                                    >
                                        +
                                    </button>
                                </span>
                                <button
                                    style={{ ...shared.smallButton, color: "var(--color-danger)" }}
                                    disabled={busy}
                                    onClick={() => void run(() => api.deleteShoppingItem(item.id))}
                                    aria-label={`Eliminar ${item.name}`}
                                >
                                    Eliminar
                                </button>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 14 }}>
                            <span style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleExpand(t.id)}>
                                {t.name}
                            </span>
                            <span style={{ color: "var(--color-text-secondary)" }}>{t.itemCount} items</span>
                            <button
                                style={shared.smallButton}
                                disabled={busy}
                                onClick={() => void run(() => api.applyShoppingTemplate(t.id))}
                            >
                                Aplicar
                            </button>
                            <button
                                style={{ ...shared.smallButton, color: "var(--color-danger)" }}
                                disabled={busy}
                                onClick={() => handleDeleteTemplate(t.id, t.name)}
                            >
                                Eliminar
                            </button>
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
