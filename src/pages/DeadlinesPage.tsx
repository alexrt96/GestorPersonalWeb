import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { Deadline, DeadlineInput, DeadlineRepeat } from "../api/types";
import { Alert, EmptyState, PageHeader, RefreshButton, SkeletonRows } from "../components/ui";
import { Icon } from "../components/Icon";
import { daysFromToday, formatDay, todayIso } from "../components/shared";

/** Categorías sugeridas (la API guarda el texto tal cual). */
const CATEGORIES = ["Coche", "Hogar", "Seguros", "Suscripciones", "Documentación", "Salud", "Otros"];

const REMIND_OPTIONS = [0, 1, 3, 7, 14, 30];

const REPEAT_LABEL: Record<DeadlineRepeat, string> = { none: "No se repite", monthly: "Cada mes", yearly: "Cada año" };

/** Días que se consideran "próximos": a partir de ahí el vencimiento va a "Más adelante". */
const SOON_DAYS = 30;

function emptyInput(): DeadlineInput {
    return { title: "", dueDate: todayIso(), remindDaysBefore: 7, repeat: "none", category: "", note: "" };
}

function toInput(d: Deadline): DeadlineInput {
    return {
        title: d.title,
        dueDate: d.dueDate,
        remindDaysBefore: d.remindDaysBefore,
        repeat: d.repeat,
        category: d.category ?? "",
        note: d.note ?? "",
    };
}

/** Texto y color de la insignia según los días que faltan. */
function dueBadge(days: number): { text: string; className: string } {
    if (days < 0) return { text: days === -1 ? "Venció ayer" : `Venció hace ${-days} días`, className: "badge-danger" };
    if (days === 0) return { text: "Hoy", className: "badge-danger" };
    if (days === 1) return { text: "Mañana", className: "badge-warning" };
    if (days <= 7) return { text: `En ${days} días`, className: "badge-warning" };
    return { text: `En ${days} días`, className: "" };
}

/** Formulario común de alta y edición. */
function DeadlineForm({
    initial,
    submitLabel,
    busy,
    onSubmit,
    onCancel,
}: {
    initial: DeadlineInput;
    submitLabel: string;
    busy: boolean;
    onSubmit: (input: DeadlineInput) => void;
    onCancel?: () => void;
}) {
    const [value, setValue] = useState(initial);
    const set = <K extends keyof DeadlineInput>(key: K, v: DeadlineInput[K]) => setValue((prev) => ({ ...prev, [key]: v }));

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const title = value.title.trim();
        if (!title || !value.dueDate) return;
        onSubmit({ ...value, title, note: value.note.trim() });
    }

    return (
        <form className="form-stack" onSubmit={handleSubmit}>
            <div className="form-row">
                <input
                    className="input"
                    placeholder="¿Qué vence? (ITV, seguro, suscripción…)"
                    aria-label="Título"
                    maxLength={120}
                    value={value.title}
                    onChange={(e) => set("title", e.target.value)}
                    autoFocus={onCancel !== undefined}
                />
                <input
                    type="date"
                    className="input"
                    aria-label="Fecha de vencimiento"
                    value={value.dueDate}
                    onChange={(e) => set("dueDate", e.target.value)}
                />
            </div>
            <div className="form-row">
                <select
                    className="select select-inline"
                    aria-label="Aviso previo"
                    value={value.remindDaysBefore}
                    onChange={(e) => set("remindDaysBefore", Number(e.target.value))}
                >
                    {REMIND_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                            {n === 0 ? "Avisar solo el día" : n === 1 ? "Avisar 1 día antes" : `Avisar ${n} días antes`}
                        </option>
                    ))}
                </select>
                <select
                    className="select select-inline"
                    aria-label="Repetición"
                    value={value.repeat}
                    onChange={(e) => set("repeat", e.target.value as DeadlineRepeat)}
                >
                    {(Object.keys(REPEAT_LABEL) as DeadlineRepeat[]).map((r) => (
                        <option key={r} value={r}>{REPEAT_LABEL[r]}</option>
                    ))}
                </select>
                <select
                    className="select select-inline"
                    aria-label="Categoría"
                    value={value.category}
                    onChange={(e) => set("category", e.target.value)}
                >
                    <option value="">Sin categoría</option>
                    {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>
            <div className="form-row" style={{ flexWrap: "nowrap" }}>
                <input
                    className="input"
                    placeholder="Nota (opcional)"
                    aria-label="Nota"
                    maxLength={500}
                    value={value.note}
                    onChange={(e) => set("note", e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={busy || !value.title.trim() || !value.dueDate}>
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

export function DeadlinesPage() {
    const { data, error, loading, refresh } = usePolling(api.deadlines, 60_000);
    const deadlines = data ?? [];
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    // Cambia al añadir uno para vaciar el formulario de alta (se remonta con otra key).
    const [formKey, setFormKey] = useState(0);

    async function run(action: () => Promise<unknown>) {
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

    const open = deadlines.filter((d) => !d.done);
    const groups = [
        { label: "Vencidos", items: open.filter((d) => daysFromToday(d.dueDate) < 0) },
        { label: "Próximos", items: open.filter((d) => daysFromToday(d.dueDate) >= 0 && daysFromToday(d.dueDate) <= SOON_DAYS) },
        { label: "Más adelante", items: open.filter((d) => daysFromToday(d.dueDate) > SOON_DAYS) },
        { label: "Hechos", items: deadlines.filter((d) => d.done) },
    ];

    function renderRow(d: Deadline) {
        if (editingId === d.id) {
            return (
                <div key={d.id} className="list-row row-wrap">
                    <DeadlineForm
                        initial={toInput(d)}
                        submitLabel="Guardar"
                        busy={busy}
                        onCancel={() => setEditingId(null)}
                        onSubmit={(input) => {
                            setEditingId(null);
                            void run(() => api.updateDeadline(d.id, input));
                        }}
                    />
                </div>
            );
        }
        const badge = d.done ? null : dueBadge(daysFromToday(d.dueDate));
        return (
            <div key={d.id} className={`list-row row-wrap${d.done ? " is-checked" : ""}`}>
                <input
                    type="checkbox"
                    className="check"
                    checked={d.done}
                    disabled={busy}
                    onChange={() => void run(() => (d.done ? api.updateDeadline(d.id, { done: false }) : api.completeDeadline(d.id)))}
                    aria-label={d.done ? `Reabrir ${d.title}` : `Marcar ${d.title} como hecho`}
                    title={d.done ? "Reabrir" : d.repeat === "none" ? "Hecho" : "Hecho (pasa a la siguiente fecha)"}
                />
                <div className="row-main">
                    <div className="row-title">{d.title}</div>
                    <div className="row-sub">
                        {formatDay(d.dueDate)}
                        {d.repeat !== "none" && ` · ${REPEAT_LABEL[d.repeat]}`}
                        {` · ${d.remindDaysBefore === 0 ? "aviso el día" : `aviso ${d.remindDaysBefore} d antes`}`}
                    </div>
                    {(d.category || d.note) && (
                        <div className="row-sub">
                            {d.category && <span className="badge badge-accent">{d.category}</span>}
                            {d.category && d.note ? " " : ""}
                            {d.note}
                        </div>
                    )}
                </div>
                <div className="row-actions">
                    {badge && <span className={`badge ${badge.className}`}>{badge.text}</span>}
                    <button
                        className="btn btn-ghost btn-sm icon-btn"
                        disabled={busy}
                        onClick={() => setEditingId(d.id)}
                        aria-label={`Editar ${d.title}`}
                        title="Editar"
                    >
                        <Icon name="edit" size={17} />
                    </button>
                    <button
                        className="btn btn-ghost btn-sm icon-btn"
                        disabled={busy}
                        onClick={() => {
                            if (!window.confirm(`¿Eliminar el vencimiento "${d.title}"?`)) return;
                            void run(() => api.deleteDeadline(d.id));
                        }}
                        aria-label={`Eliminar ${d.title}`}
                        title="Eliminar"
                    >
                        <Icon name="trash" size={17} />
                    </button>
                </div>
            </div>
        );
    }

    const overdue = groups[0].items.length;

    return (
        <div className="page">
            <PageHeader
                title="Vencimientos"
                subtitle={
                    data
                        ? `${open.length} pendiente${open.length === 1 ? "" : "s"}${overdue > 0 ? ` · ${overdue} vencido${overdue === 1 ? "" : "s"}` : ""} · solo tuyos. Los avisos llegan como notificación en la app del móvil`
                        : "Solo tuyos. Los avisos llegan como notificación en la app del móvil"
                }
                actions={<RefreshButton onClick={refresh} loading={loading} disabled={busy} />}
            />

            {error && <Alert>{error}</Alert>}
            {actionError && <Alert>{actionError}</Alert>}

            <div className="card">
                <DeadlineForm
                    key={formKey}
                    initial={emptyInput()}
                    submitLabel="Añadir"
                    busy={busy}
                    onSubmit={(input) => {
                        setFormKey((k) => k + 1);
                        void run(() => api.addDeadline(input));
                    }}
                />
            </div>

            <div className="card flush">
                {data === null && loading ? (
                    <SkeletonRows rows={3} />
                ) : deadlines.length === 0 ? (
                    <EmptyState icon="bell" title="Sin vencimientos todavía" text="Añade la ITV, el seguro, una suscripción… y la app del móvil te avisará." />
                ) : (
                    groups
                        .filter((g) => g.items.length > 0)
                        .map((g) => (
                            <div key={g.label}>
                                <div className="group-label">{g.label}</div>
                                {g.items.map(renderRow)}
                            </div>
                        ))
                )}
            </div>
        </div>
    );
}
