import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { ShoppingTemplateDetail } from "../api/types";
import { Alert, EmptyState, PageHeader, RefreshButton, SkeletonRows } from "../components/ui";
import { Icon } from "../components/Icon";

const CATEGORY_ORDER = ["Frescos", "Despensa", "Limpieza", "Bebidas", "Otros"];
const NO_CATEGORY = "Sin categoría";

function groupByCategory<T extends { category: string | null }>(items: T[]): [string, T[]][] {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        const key = item.category ?? NO_CATEGORY;
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
    const [newCategory, setNewCategory] = useState("Otros");
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

    const all = items.data ?? [];
    const grouped = groupByCategory(all);
    const checkedCount = all.filter((i) => i.checked).length;
    const progress = all.length > 0 ? Math.round((checkedCount / all.length) * 100) : 0;

    return (
        <div className="page">
            <PageHeader
                title="Lista de la compra"
                subtitle={items.data ? `${all.length} artículo${all.length === 1 ? "" : "s"} · ${checkedCount} marcado${checkedCount === 1 ? "" : "s"} · compartida con todos` : "Compartida con todos los usuarios"}
                actions={
                    <RefreshButton
                        onClick={() => {
                            items.refresh();
                            templates.refresh();
                        }}
                        loading={items.loading}
                        disabled={busy}
                    />
                }
            />

            {items.error && <Alert>{items.error}</Alert>}
            {actionError && <Alert>{actionError}</Alert>}

            <form className="card form-stack" onSubmit={handleAdd}>
                <div className="form-row" style={{ flexWrap: "nowrap" }}>
                    <input
                        className="input"
                        placeholder="Añadir artículo…"
                        aria-label="Nombre del artículo"
                        enterKeyHint="done"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <div className="stepper" role="group" aria-label="Cantidad">
                        <button type="button" onClick={() => setNewQuantity((q) => Math.max(1, q - 1))} disabled={newQuantity <= 1} aria-label="Menos">
                            <Icon name="minus" size={16} />
                        </button>
                        <span className="stepper-value">{newQuantity}</span>
                        <button type="button" onClick={() => setNewQuantity((q) => q + 1)} aria-label="Más">
                            <Icon name="plus" size={16} />
                        </button>
                    </div>
                </div>
                <div className="chips" role="radiogroup" aria-label="Categoría">
                    {CATEGORY_ORDER.map((c) => (
                        <button
                            key={c}
                            type="button"
                            role="radio"
                            aria-checked={newCategory === c}
                            className={`chip${newCategory === c ? " active" : ""}`}
                            onClick={() => setNewCategory(c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={busy || !newName.trim()}>
                    <Icon name="plus" size={17} />
                    Añadir a la lista
                </button>
            </form>

            <div className="card flush">
                {items.data === null && items.loading ? (
                    <SkeletonRows rows={4} />
                ) : all.length === 0 ? (
                    <EmptyState icon="cart" title="La lista está vacía" text="Añade tu primer artículo arriba o aplica una plantilla." />
                ) : (
                    <>
                        <div style={{ padding: "16px 16px 4px" }}>
                            <div className="list-toolbar">
                                <span className="list-toolbar-label">
                                    {checkedCount === all.length ? "Todo cogido" : `${all.length - checkedCount} por coger`}
                                </span>
                                <span className="row-actions">
                                    <button className="btn btn-sm" onClick={handleSaveTemplate} disabled={busy}>
                                        <Icon name="bookmark" size={15} />
                                        Guardar plantilla
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => void run(() => api.clearCheckedShoppingItems())}
                                        disabled={busy || checkedCount === 0}
                                    >
                                        <Icon name="trash" size={15} />
                                        Quitar marcados
                                    </button>
                                </span>
                            </div>
                            <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                                <span style={{ width: `${progress}%` }} />
                            </div>
                        </div>

                        {grouped.map(([category, categoryItems]) => (
                            <div key={category}>
                                <div className="group-label">{category}</div>
                                {categoryItems.map((item) => (
                                    <div key={item.id} className={`list-row${item.checked ? " is-checked" : ""}`}>
                                        <input
                                            type="checkbox"
                                            className="check"
                                            checked={item.checked}
                                            disabled={busy}
                                            onChange={() => void run(() => api.patchShoppingItem(item.id, { checked: !item.checked }))}
                                            aria-label={`Marcar ${item.name}`}
                                        />
                                        <div className="row-main">
                                            <div className="row-title">{item.name}</div>
                                        </div>
                                        <div className="stepper" role="group" aria-label={`Cantidad de ${item.name}`}>
                                            <button
                                                disabled={busy || item.quantity <= 1}
                                                onClick={() => void run(() => api.patchShoppingItem(item.id, { quantity: item.quantity - 1 }))}
                                                aria-label={`Reducir cantidad de ${item.name}`}
                                            >
                                                <Icon name="minus" size={15} />
                                            </button>
                                            <span className="stepper-value">{item.quantity}</span>
                                            <button
                                                disabled={busy}
                                                onClick={() => void run(() => api.patchShoppingItem(item.id, { quantity: item.quantity + 1 }))}
                                                aria-label={`Aumentar cantidad de ${item.name}`}
                                            >
                                                <Icon name="plus" size={15} />
                                            </button>
                                        </div>
                                        <button
                                            className="btn btn-ghost btn-sm icon-btn"
                                            disabled={busy}
                                            onClick={() => void run(() => api.deleteShoppingItem(item.id))}
                                            aria-label={`Eliminar ${item.name}`}
                                            title="Eliminar"
                                        >
                                            <Icon name="trash" size={17} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </>
                )}
            </div>

            <div className="card flush">
                <div className="group-label" style={{ paddingTop: 16 }}>
                    Plantillas
                </div>
                {templates.data !== null && templates.data.length === 0 ? (
                    <EmptyState icon="bookmark" title="Sin plantillas" text="Guarda la lista actual como plantilla para reutilizarla otra semana." />
                ) : (
                    (templates.data ?? []).map((t) => (
                        <div key={t.id} style={{ borderBottom: "1px solid var(--color-border-soft)" }}>
                            <div className="list-row" style={{ borderBottom: "none" }}>
                                <button
                                    className="row-main"
                                    style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
                                    onClick={() => void toggleExpand(t.id)}
                                    aria-expanded={expanded === t.id}
                                >
                                    <div className="row-title">{t.name}</div>
                                    <div className="row-sub">{t.itemCount} artículo{t.itemCount === 1 ? "" : "s"}</div>
                                </button>
                                <div className="row-actions">
                                    <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => void run(() => api.applyShoppingTemplate(t.id))}>
                                        Aplicar
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm icon-btn"
                                        disabled={busy}
                                        onClick={() => handleDeleteTemplate(t.id, t.name)}
                                        aria-label={`Eliminar plantilla ${t.name}`}
                                        title="Eliminar"
                                    >
                                        <Icon name="trash" size={17} />
                                    </button>
                                </div>
                            </div>
                            {expanded === t.id && (
                                <div style={{ padding: "0 16px 14px 16px", fontSize: 13, color: "var(--color-text-secondary)", display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {detail ? detail.items.map((i, idx) => <span key={idx} className="badge">{i.name} × {i.quantity}</span>) : "Cargando…"}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
