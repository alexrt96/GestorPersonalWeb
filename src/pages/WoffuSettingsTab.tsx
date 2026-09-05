import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { shared } from "../components/shared";

export function WoffuSettingsTab() {
    const [token, setToken] = useState("");
    const [userId, setUserId] = useState("");
    const [isActivated, setIsActivated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.woffuSettings()
            .then((s) => {
                setToken(s.token ?? "");
                setUserId(s.userId != null ? String(s.userId) : "");
                setIsActivated(s.isActivated);
            })
            .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo conectar con la API"))
            .finally(() => setLoading(false));
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        setError(null);
        try {
            const parsedUserId = userId.trim() ? Number(userId.trim()) : null;
            const saved = await api.saveWoffuSettings({
                token: token.trim() || null,
                userId: parsedUserId,
                isActivated,
            });
            setToken(saved.token ?? "");
            setUserId(saved.userId != null ? String(saved.userId) : "");
            setMessage("Ajustes guardados. La app Android los recogerá la próxima vez que abras WoffuManager en el móvil.");
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo conectar con la API");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div style={shared.page}>Cargando…</div>;

    return (
        <div style={shared.page}>
            <div style={shared.card}>
                <p style={{ marginTop: 0, color: "var(--color-text-secondary)", fontSize: 13, lineHeight: 1.5 }}>
                    Estas credenciales se guardan en el backend y las usa tanto este visor como la app Android
                    para hablar con la API real de Woffu. El fichaje automático del móvil sigue una copia local
                    y solo se actualiza la próxima vez que abras la pantalla de ajustes en el teléfono.
                </p>
                <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <label style={styles.label}>
                        Token de API
                        <input
                            style={styles.input}
                            type="password"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="Bearer token de Woffu"
                        />
                    </label>
                    <label style={styles.label}>
                        User ID
                        <input
                            style={styles.input}
                            inputMode="numeric"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value.replace(/\D/g, ""))}
                            placeholder="123456"
                        />
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                        <span style={shared.tag}>{isActivated ? "Activado" : "Desactivado"}</span>
                        <span style={{ color: "var(--color-text-secondary)" }}>
                            (la automatización solo se activa/desactiva desde el móvil)
                        </span>
                    </div>
                    {error && <div style={shared.errorBox}>{error}</div>}
                    {message && <div style={styles.successBox}>{message}</div>}
                    <button type="submit" disabled={saving} style={styles.saveButton}>
                        {saving ? "Guardando…" : "Guardar"}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--color-text-secondary)" },
    input: {
        background: "var(--color-surface-alt)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "10px 12px",
        color: "var(--color-text)",
        fontSize: 14,
    },
    successBox: {
        background: "rgba(127,217,168,0.12)",
        border: "1px solid var(--color-success)",
        color: "var(--color-success)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
    },
    saveButton: {
        alignSelf: "flex-start",
        background: "transparent",
        border: "1px solid var(--color-accent)",
        color: "var(--color-accent)",
        borderRadius: 10,
        padding: "10px 20px",
        fontSize: 14,
        cursor: "pointer",
    },
};
