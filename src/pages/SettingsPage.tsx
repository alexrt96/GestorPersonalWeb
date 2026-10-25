import { useState } from "react";
import { api, ApiError } from "../api/client";
import type { ModuleSettings } from "../api/types";
import { Alert, PageHeader, Switch } from "../components/ui";
import { Icon } from "../components/Icon";
import { MODULES } from "../modules";

interface Props {
    username: string;
    modules: ModuleSettings;
    onModulesChange: (modules: ModuleSettings) => void;
    onLogout: () => void;
}

export function SettingsPage({ username, modules, onModulesChange, onLogout }: Props) {
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function toggle(id: string, enabled: boolean) {
        setBusy(id);
        setError(null);
        try {
            onModulesChange(await api.saveModules({ [id]: enabled }));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar el cambio");
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="page page-narrow">
            <PageHeader title="Ajustes" subtitle={`Sesión iniciada como ${username}`} />

            {error && <Alert>{error}</Alert>}

            <section>
                <h2 className="card-title">Módulos</h2>
                <p className="page-subtitle" style={{ margin: "0 0 12px" }}>
                    Elige qué secciones ves. Se guarda en tu usuario, así que también se aplica en la app del móvil.
                </p>
                <div className="card flush">
                    {MODULES.map((m) => (
                        <div key={m.id} className="setting-row">
                            <span className="row-icon">
                                <Icon name={m.icon} />
                            </span>
                            <div className="row-main">
                                <div className="row-title">{m.label}</div>
                                <div className="row-sub">{m.description}</div>
                            </div>
                            <span className={`badge ${m.shared ? "badge-accent" : ""}`}>{m.shared ? "Compartido" : "Solo tuyo"}</span>
                            <Switch
                                label={`Mostrar ${m.label}`}
                                checked={modules[m.id] ?? true}
                                disabled={busy !== null}
                                onChange={(enabled) => void toggle(m.id, enabled)}
                            />
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="card-title">Cuenta</h2>
                <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <span className="avatar" aria-hidden="true">
                            {username.charAt(0)}
                        </span>
                        <div style={{ minWidth: 0 }}>
                            <div className="row-title">{username}</div>
                            <div className="row-sub">Tus datos personales no son visibles para otros usuarios</div>
                        </div>
                    </div>
                    <button className="btn" onClick={onLogout}>
                        <Icon name="logout" size={16} />
                        Cerrar sesión
                    </button>
                </div>
            </section>
        </div>
    );
}
