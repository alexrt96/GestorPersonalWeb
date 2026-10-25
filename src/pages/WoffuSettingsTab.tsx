import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { Alert, SkeletonRows } from "../components/ui";

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

    if (loading) {
        return (
            <div className="card flush">
                <SkeletonRows rows={3} />
            </div>
        );
    }

    return (
        <div className="card">
            <p className="page-subtitle" style={{ marginBottom: 18, lineHeight: 1.55 }}>
                Estas credenciales se guardan en el backend, en tu usuario, y las usan tanto este visor como la app Android para hablar con la API real de Woffu. El
                fichaje automático del móvil sigue una copia local y solo se actualiza la próxima vez que abras la pantalla de ajustes en el teléfono.
            </p>
            <form onSubmit={handleSave} className="form-stack">
                <label className="field">
                    Token de API
                    <input
                        className="input"
                        type="password"
                        autoComplete="off"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Bearer token de Woffu"
                    />
                </label>
                <label className="field">
                    User ID
                    <input
                        className="input"
                        inputMode="numeric"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                    />
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className={`badge ${isActivated ? "badge-success" : ""}`}>{isActivated ? "Activado" : "Desactivado"}</span>
                    <span className="field-hint">La automatización solo se activa o desactiva desde el móvil.</span>
                </div>
                {error && <Alert>{error}</Alert>}
                {message && <Alert kind="success">{message}</Alert>}
                <div>
                    <button type="submit" disabled={saving} className="btn btn-primary">
                        {saving ? "Guardando…" : "Guardar cambios"}
                    </button>
                </div>
            </form>
        </div>
    );
}
