import { useState } from "react";
import { checkHealth } from "../api/client";
import { storeCredentials } from "../api/config";

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
            setError("No se pudo contactar con esa URL. Comprueba que la API esté desplegada y accesible.");
            return;
        }
        storeCredentials(cleanUrl, apiKey.trim());
        onReady();
    }

    return (
        <div style={styles.wrap}>
            <form style={styles.card} onSubmit={handleSubmit}>
                <h1 style={styles.title}>GestorPersonal — Visor</h1>
                <p style={styles.subtitle}>
                    Introduce la URL de tu API y la clave de acceso. Se guardan solo en este navegador.
                </p>
                <label style={styles.label}>
                    URL de la API
                    <input
                        style={styles.input}
                        placeholder="https://tu-api.azurewebsites.net"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                    />
                </label>
                <label style={styles.label}>
                    API key
                    <input
                        style={styles.input}
                        type="password"
                        placeholder="x-api-key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                </label>
                {error && <div style={styles.error}>{error}</div>}
                <button style={styles.button} type="submit" disabled={checking}>
                    {checking ? "Comprobando…" : "Entrar"}
                </button>
            </form>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    wrap: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg)",
        padding: 16,
    },
    card: {
        background: "var(--color-surface)",
        borderRadius: 14,
        padding: 32,
        width: "100%",
        maxWidth: 380,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        border: "1px solid var(--color-border)",
    },
    title: { margin: 0, fontSize: 20, fontWeight: 500 },
    subtitle: { margin: 0, color: "var(--color-text-secondary)", fontSize: 13, lineHeight: 1.5 },
    label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--color-text-secondary)" },
    input: {
        background: "var(--color-surface-alt)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "10px 12px",
        color: "var(--color-text)",
        fontSize: 14,
    },
    error: { color: "var(--color-danger)", fontSize: 13 },
    button: {
        marginTop: 6,
        background: "transparent",
        border: "1px solid var(--color-accent)",
        color: "var(--color-accent)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 14,
        cursor: "pointer",
    },
};
