import { useState } from "react";
import { api, ApiError } from "../api/client";
import type { ModuleSettings } from "../api/types";
import { shared } from "../components/shared";
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
        <div style={shared.page}>
            <div style={shared.headerRow}>
                <h1 style={shared.pageTitle}>Ajustes</h1>
            </div>

            {error && <div style={shared.errorBox}>{error}</div>}

            <div style={shared.card}>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Módulos</div>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-secondary)" }}>
                    Elige qué pestañas ves. Se guarda en tu usuario, así que también se aplica en la app del móvil.
                </p>
                {MODULES.map((m) => (
                    <label
                        key={m.id}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 0",
                            borderBottom: "1px solid var(--color-border)",
                            cursor: busy ? "default" : "pointer",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={modules[m.id] ?? true}
                            disabled={busy !== null}
                            onChange={(e) => void toggle(m.id, e.target.checked)}
                        />
                        <span style={{ flex: 1 }}>
                            <span style={{ fontSize: 14 }}>{m.label}</span>
                            <br />
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{m.description}</span>
                        </span>
                        <span style={shared.tag}>{m.shared ? "Compartido" : "Solo tuyo"}</span>
                    </label>
                ))}
            </div>

            <div style={shared.card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 14 }}>
                        Sesión iniciada como <strong>{username}</strong>
                    </span>
                    <button style={shared.smallButton} onClick={onLogout}>
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    );
}
