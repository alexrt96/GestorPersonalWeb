import { useState } from "react";
import { checkHealth } from "../api/client";
import { storeCredentials } from "../api/config";
import { Alert } from "./ui";
import { Icon } from "./Icon";

interface Props {
    onReady: () => void;
}

export function ApiKeyGate({ onReady }: Props) {
    const [baseUrl, setBaseUrl] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const cleanUrl = baseUrl.trim().replace(/\/+$/, "");
        if (!cleanUrl || !apiKey.trim()) {
            setError("Rellena la URL de la API y la clave.");
            return;
        }
        setChecking(true);
        const ok = await checkHealth(cleanUrl);
        setChecking(false);
        if (!ok) {
            setError("No se pudo contactar con esa URL. Comprueba que la API esté desplegada y accesible (la primera vez puede tardar hasta un minuto en despertar).");
            return;
        }
        storeCredentials(cleanUrl, apiKey.trim());
        onReady();
    }

    return (
        <div className="auth-wrap">
            <form className="auth-card" onSubmit={handleSubmit}>
                <div className="auth-brand">
                    <span className="brand-mark">
                        <Icon name="layers" size={26} />
                    </span>
                    <div>
                        <h1 className="auth-title">GestorPersonal</h1>
                        <p className="auth-subtitle">Conecta el visor con tu API. Los datos se guardan solo en este navegador.</p>
                    </div>
                </div>
                <label className="field">
                    URL de la API
                    <input
                        className="input"
                        type="url"
                        inputMode="url"
                        autoCapitalize="none"
                        autoCorrect="off"
                        placeholder="https://tu-api.onrender.com"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                    />
                </label>
                <label className="field">
                    API key
                    <input
                        className="input"
                        type="password"
                        autoComplete="off"
                        placeholder="x-api-key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                </label>
                {error && <Alert>{error}</Alert>}
                <button className="btn btn-primary btn-block" type="submit" disabled={checking}>
                    {checking ? "Comprobando…" : "Continuar"}
                </button>
            </form>
        </div>
    );
}
