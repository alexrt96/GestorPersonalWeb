import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { GiftIdea, GiftIdeaInput, WishlistItem, WishlistItemInput } from "../api/types";
import { Alert, EmptyState, PageHeader, RefreshButton, SkeletonRows } from "../components/ui";
import { Icon } from "../components/Icon";

const priceFormat = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

/** "Hoy es el día de Reyes" / "Mañana son los Reyes" / "Faltan N días para Reyes". */
function reyesCountdown(): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let reyes = new Date(today.getFullYear(), 0, 6);
    if (today > reyes) reyes = new Date(today.getFullYear() + 1, 0, 6);
    const days = Math.round((reyes.getTime() - today.getTime()) / 86_400_000);
    if (days === 0) return "Hoy es el día de Reyes";
    if (days === 1) return "Mañana son los Reyes";
    return `Faltan ${days} días para Reyes`;
}

/** La API solo acepta enlaces http(s): si se pega "amazon.es/…" sin esquema se le añade https://. */
function normalizeUrl(url: string): string {
    const trimmed = url.trim();
    return trimmed === "" || /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function parsePrice(text: string): number | null | "invalid" {
    const trimmed = text.trim();
    if (trimmed === "") return null;
    const value = Number(trimmed.replace(",", "."));
    return Number.isFinite(value) && value >= 0 ? value : "invalid";
}

interface FormValue {
    recipientName: string;
    title: string;
    url: string;
    price: string;
    note: string;
}

function toFormValue(x?: { title: string; url: string | null; price: number | null; note: string | null; recipientName?: string }): FormValue {
    return {
        recipientName: x?.recipientName ?? "",
        title: x?.title ?? "",
        url: x?.url ?? "",
        price: x?.price != null ? String(x.price).replace(".", ",") : "",
        note: x?.note ?? "",
    };
}

/**
 * Formulario común de deseos e ideas. Con `recipients` (lista oculta) pide además para quién, con sugerencias
 * de los nombres ya usados.
 */
function GiftForm({
    initial,
    recipients,
    titlePlaceholder,
    submitLabel,
    busy,
    onSubmit,
    onCancel,
}: {
    initial: FormValue;
    recipients?: string[];
    titlePlaceholder: string;
    submitLabel: string;
    busy: boolean;
    onSubmit: (input: GiftIdeaInput) => void;
    onCancel?: () => void;
}) {
    const [value, setValue] = useState(initial);
    const set = <K extends keyof FormValue>(key: K, v: string) => setValue((prev) => ({ ...prev, [key]: v }));
    const price = parsePrice(value.price);
    const needsRecipient = recipients !== undefined;
    const valid = value.title.trim() !== "" && price !== "invalid" && (!needsRecipient || value.recipientName.trim() !== "");

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
            recipientName: value.recipientName.trim(),
            title: value.title.trim(),
            url: normalizeUrl(value.url),
            price,
            note: value.note.trim(),
        });
    }

    return (
        <form className="form-stack" onSubmit={handleSubmit}>
            <div className="form-row">
                {needsRecipient && (
                    <>
                        <input
                            className="input"
                            placeholder="¿Para quién? (Mamá, tío Luis…)"
                            aria-label="Para quién"
                            maxLength={60}
                            list="gift-recipients"
                            value={value.recipientName}
                            onChange={(e) => set("recipientName", e.target.value)}
                            autoFocus={onCancel !== undefined}
                        />
                        <datalist id="gift-recipients">
                            {recipients.map((r) => (
                                <option key={r} value={r} />
                            ))}
                        </datalist>
                    </>
                )}
                <input
                    className="input"
                    placeholder={titlePlaceholder}
                    aria-label="Título"
                    maxLength={120}
                    value={value.title}
                    onChange={(e) => set("title", e.target.value)}
                    autoFocus={onCancel !== undefined && !needsRecipient}
                />
            </div>
            <div className="form-row">
                <input
                    className="input"
                    placeholder="Enlace (opcional)"
                    aria-label="Enlace"
                    maxLength={500}
                    value={value.url}
                    onChange={(e) => set("url", e.target.value)}
                />
                <input
                    className="input"
                    placeholder="Precio aprox. en € (opcional)"
                    aria-label="Precio aproximado"
                    inputMode="decimal"
                    maxLength={12}
                    aria-invalid={price === "invalid"}
                    value={value.price}
                    onChange={(e) => set("price", e.target.value)}
                />
            </div>
            <div className="form-row" style={{ flexWrap: "nowrap" }}>
                <input
                    className="input"
                    placeholder="Nota: talla, color, modelo… (opcional)"
                    aria-label="Nota"
                    maxLength={500}
                    value={value.note}
                    onChange={(e) => set("note", e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={busy || !valid}>
                    {submitLabel}
                </button>
                {onCancel && (
                    <button type="button" className="btn" onClick={onCancel} disabled={busy}>
                        Cancelar
                    </button>
                )}
            </div>
        </form>
    );
}

/** Precio, nota y enlace bajo el título de un deseo o idea. */
function GiftDetails({ price, note, url }: { price: number | null; note: string | null; url: string | null }) {
    if (price == null && !note && !url) return null;
    return (
        <div className="row-sub">
            {price != null && <span className="badge badge-accent">{priceFormat.format(price)}</span>}
            {price != null && (note || url) ? " " : ""}
            {note}
            {note && url ? " · " : ""}
            {url && (
                <a href={url} target="_blank" rel="noopener noreferrer">
                    <Icon name="external" size={13} /> {url.replace(/^https?:\/\/(www\.)?/i, "")}
                </a>
            )}
        </div>
    );
}

export function WishlistPage() {
    const wishlists = usePolling(api.wishlists, 60_000);
    const ideas = usePolling(api.giftIdeas, 60_000);
    const [hiddenTab, setHiddenTab] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [editing, setEditing] = useState<string | null>(null);
    // Cambia al añadir para vaciar el formulario de alta (se remonta con otra key).
    const [formKey, setFormKey] = useState(0);

    async function run(action: () => Promise<unknown>, refresh: () => void) {
        setBusy(true);
        setActionError(null);
        try {
            await action();
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : "No se pudo conectar con la API");
        } finally {
            setBusy(false);
            refresh();
        }
    }

    function refreshAll() {
        wishlists.refresh();
        ideas.refresh();
    }

    const people = wishlists.data ?? [];
    // Por defecto, la propia carta (la API la devuelve la primera).
    const selected = people.find((p) => p.userId === selectedUserId) ?? people[0];
    const ideaList = ideas.data ?? [];
    const recipients = [...new Set(ideaList.map((i) => i.recipientName))];

    function deleteButton(title: string, onDelete: () => void) {
        return (
            <button
                className="btn btn-ghost btn-sm icon-btn"
                disabled={busy}
                onClick={() => {
                    if (!window.confirm(`¿Eliminar "${title}"?`)) return;
                    onDelete();
                }}
                aria-label={`Eliminar ${title}`}
                title="Eliminar"
            >
                <Icon name="trash" size={17} />
            </button>
        );
    }

    function editButton(title: string, key: string) {
        return (
            <button
                className="btn btn-ghost btn-sm icon-btn"
                disabled={busy}
                onClick={() => setEditing(key)}
                aria-label={`Editar ${title}`}
                title="Editar"
            >
                <Icon name="edit" size={17} />
            </button>
        );
    }

    function renderItem(item: WishlistItem, editable: boolean) {
        const key = `item_${item.id}`;
        if (editable && editing === key) {
            return (
                <div key={item.id} className="list-row row-wrap">
                    <GiftForm
                        initial={toFormValue(item)}
                        titlePlaceholder="¿Qué te gustaría?"
                        submitLabel="Guardar"
                        busy={busy}
                        onCancel={() => setEditing(null)}
                        onSubmit={({ title, url, price, note }) => {
                            setEditing(null);
                            const input: WishlistItemInput = { title, url, price, note };
                            void run(() => api.updateWishlistItem(item.id, input), wishlists.refresh);
                        }}
                    />
                </div>
            );
        }
        return (
            <div key={item.id} className="list-row row-wrap">
                <div className="row-main">
                    <div className="row-title">{item.title}</div>
                    <GiftDetails price={item.price} note={item.note} url={item.url} />
                </div>
                {editable && (
                    <div className="row-actions">
                        {editButton(item.title, key)}
                        {deleteButton(item.title, () => void run(() => api.deleteWishlistItem(item.id), wishlists.refresh))}
                    </div>
                )}
            </div>
        );
    }

    function renderIdea(idea: GiftIdea) {
        const key = `idea_${idea.id}`;
        if (editing === key) {
            return (
                <div key={idea.id} className="list-row row-wrap">
                    <GiftForm
                        initial={toFormValue(idea)}
                        recipients={recipients}
                        titlePlaceholder="¿Qué le vas a regalar?"
                        submitLabel="Guardar"
                        busy={busy}
                        onCancel={() => setEditing(null)}
                        onSubmit={(input) => {
                            setEditing(null);
                            void run(() => api.updateGiftIdea(idea.id, input), ideas.refresh);
                        }}
                    />
                </div>
            );
        }
        return (
            <div key={idea.id} className={`list-row row-wrap${idea.bought ? " is-checked" : ""}`}>
                <input
                    type="checkbox"
                    className="check"
                    checked={idea.bought}
                    disabled={busy}
                    onChange={() => void run(() => api.setGiftIdeaBought(idea.id, !idea.bought), ideas.refresh)}
                    aria-label={idea.bought ? `Marcar ${idea.title} como no comprado` : `Marcar ${idea.title} como comprado`}
                    title={idea.bought ? "Comprado" : "Marcar como comprado"}
                />
                <div className="row-main">
                    <div className="row-title">{idea.title}</div>
                    <GiftDetails price={idea.price} note={idea.note} url={idea.url} />
                </div>
                <div className="row-actions">
                    {editButton(idea.title, key)}
                    {deleteButton(idea.title, () => void run(() => api.deleteGiftIdea(idea.id), ideas.refresh))}
                </div>
            </div>
        );
    }

    const groups = recipients.map((name) => {
        const items = ideaList.filter((i) => i.recipientName === name);
        const bought = items.filter((i) => i.bought).length;
        const total = items.reduce((sum, i) => sum + (i.price ?? 0), 0);
        return {
            name,
            items,
            label: `${name} · ${bought}/${items.length} comprado${bought === 1 ? "" : "s"}${total > 0 ? ` · ${priceFormat.format(total)}` : ""}`,
        };
    });

    const error = hiddenTab ? ideas.error : wishlists.error;

    return (
        <div className="page">
            <PageHeader
                title="Reyes Magos"
                subtitle={`${reyesCountdown()} · tu carta la ven todos; tu lista oculta, solo tú`}
                actions={<RefreshButton onClick={refreshAll} loading={wishlists.loading || ideas.loading} disabled={busy} />}
            />

            {error && <Alert>{error}</Alert>}
            {actionError && <Alert>{actionError}</Alert>}

            <div className="chips" role="tablist" aria-label="Lista">
                <button type="button" role="tab" aria-selected={!hiddenTab} className={`chip${!hiddenTab ? " active" : ""}`} onClick={() => setHiddenTab(false)}>
                    Deseos
                </button>
                <button type="button" role="tab" aria-selected={hiddenTab} className={`chip${hiddenTab ? " active" : ""}`} onClick={() => setHiddenTab(true)}>
                    <Icon name="lock" size={13} /> Mi lista oculta
                </button>
            </div>

            {!hiddenTab ? (
                <>
                    {people.length > 0 && (
                        <div className="chips" role="radiogroup" aria-label="Persona">
                            {people.map((p) => (
                                <button
                                    key={p.userId}
                                    type="button"
                                    role="radio"
                                    aria-checked={p.userId === selected?.userId}
                                    className={`chip${p.userId === selected?.userId ? " active" : ""}`}
                                    onClick={() => {
                                        setSelectedUserId(p.userId);
                                        setEditing(null);
                                    }}
                                >
                                    {p.isMe ? "Mi carta" : p.username}
                                </button>
                            ))}
                        </div>
                    )}

                    {selected?.isMe && (
                        <div className="card">
                            <GiftForm
                                key={formKey}
                                initial={toFormValue()}
                                titlePlaceholder="¿Qué te gustaría?"
                                submitLabel="Añadir"
                                busy={busy}
                                onSubmit={({ title, url, price, note }) => {
                                    setFormKey((k) => k + 1);
                                    void run(() => api.addWishlistItem({ title, url, price, note }), wishlists.refresh);
                                }}
                            />
                        </div>
                    )}

                    <div className="card flush">
                        {wishlists.data === null && wishlists.loading ? (
                            <SkeletonRows rows={3} />
                        ) : !selected || selected.items.length === 0 ? (
                            <EmptyState
                                icon="gift"
                                title={!selected || selected.isMe ? "Tu carta está vacía" : `${selected.username} aún no ha pedido nada`}
                                text={!selected || selected.isMe ? "Añade lo que te gustaría que te trajeran los Reyes. Todos los usuarios podrán verlo." : "Cuando añada deseos a su carta aparecerán aquí."}
                            />
                        ) : (
                            selected.items.map((item) => renderItem(item, selected.isMe))
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className="card">
                        <GiftForm
                            key={formKey}
                            initial={toFormValue()}
                            recipients={recipients}
                            titlePlaceholder="¿Qué le vas a regalar?"
                            submitLabel="Añadir"
                            busy={busy}
                            onSubmit={(input) => {
                                setFormKey((k) => k + 1);
                                void run(() => api.addGiftIdea(input), ideas.refresh);
                            }}
                        />
                    </div>

                    <div className="card flush">
                        {ideas.data === null && ideas.loading ? (
                            <SkeletonRows rows={3} />
                        ) : ideaList.length === 0 ? (
                            <EmptyState icon="lock" title="Sin ideas todavía" text="Apunta lo que piensas regalar a cada persona. Nadie más puede verlo." />
                        ) : (
                            groups.map((g) => (
                                <div key={g.name}>
                                    <div className="group-label">{g.label}</div>
                                    {g.items.map(renderIdea)}
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
