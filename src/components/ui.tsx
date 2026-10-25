import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

/** Cabecera de página: título, subtítulo opcional y acciones a la derecha (pasan debajo en móvil). */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
    return (
        <div className="page-header">
            <div className="page-header-text">
                <h1 className="page-title">{title}</h1>
                {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
        </div>
    );
}

/** Botón de refrescar con icono que gira mientras carga. */
export function RefreshButton({ onClick, loading, disabled }: { onClick: () => void; loading?: boolean; disabled?: boolean }) {
    return (
        <button
            className={`btn icon-btn${loading ? " is-loading" : ""}`}
            onClick={onClick}
            disabled={disabled || loading}
            aria-label="Actualizar"
            title="Actualizar"
        >
            <Icon name="refresh" />
        </button>
    );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success"; children: ReactNode }) {
    return (
        <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
            <Icon name={kind === "error" ? "alert" : "check"} size={16} />
            <span>{children}</span>
        </div>
    );
}

export function EmptyState({ icon = "inbox", title, text }: { icon?: IconName; title: string; text?: string }) {
    return (
        <div className="empty-state">
            <div className="empty-icon">
                <Icon name={icon} size={24} />
            </div>
            <div className="empty-title">{title}</div>
            {text && <div className="empty-text">{text}</div>}
        </div>
    );
}

/** Marcadores de carga con brillo, para listas y tablas mientras llegan los datos por primera vez. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
    return (
        <div className="skeleton-list" aria-busy="true" aria-label="Cargando">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="skeleton skeleton-row" />
            ))}
        </div>
    );
}

/** Interruptor accesible (checkbox con aspecto de switch). */
export function Switch({
    checked,
    onChange,
    disabled,
    label,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label: string;
}) {
    return (
        <label className="switch">
            <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
            <span className="switch-track" />
        </label>
    );
}
