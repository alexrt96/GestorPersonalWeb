import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { storeSession } from "../api/config";

interface Props {
    onLoggedIn: (username: string) => void;
    onChangeCredentials: () => void;
}

export function LoginGate({ onLoggedIn, onChangeCredentials }: Props) {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        if (!username.trim() || !password) {
            setError("Rellena el usuario y la contraseña.");
            return;
        }
        setBusy(true);
        try {
            const result = mode === "login"
                ? await api.login(username.trim(), password)
                : await api.register(username.trim(), password);
            storeSession(result.token, result.user.username);
            onLoggedIn(result.user.username);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo conectar con la API");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={styles.wrap}>
            <form style={styles.card} onSubmit={handleSubmit}>
                <h1 style={styles.title}>{mode === "login" ? "Iniciar sesión" : "Crear usuario"}</h1>
                <p style={styles.subtitle}>
                    Tus dispositivos y tu WoffuManager son solo tuyos. La lista de la compra y los destinos son comunes a todos los usuarios.
                </p>
                <label style={styles.label}>
                    Usuario
                    <input
                        style={styles.input}
                        autoComplete="username"
                        autoCapitalize="none"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </label>
                <label style={styles.label}>
                    Contraseña
                    <input
                        style={styles.input}
                        type="password"
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        placeholder={mode === "register" ? "Mínimo 8 caracteres" : undefined}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </label>
                {error && <div style={styles.error}>{error}</div>}
                <button style={styles.button} type="submit" disabled={busy}>
                    {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear usuario y entrar"}
                </button>
                <button
                    type="button"
                    style={styles.link}
                    onClick={() => {
                        setMode(mode === "login" ? "register" : "login");
                        setError(null);
                    }}
                >
                    {mode === "login" ? "No tengo usuario: crear uno" : "Ya tengo usuario: iniciar sesión"}
                </button>
                <button type="button" style={styles.link} onClick={onChangeCredentials}>
                    Cambiar URL / API key
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
    link: {
        background: "transparent",
        border: "none",
        color: "var(--color-text-secondary)",
        fontSize: 12,
        cursor: "pointer",
        textDecoration: "underline",
    },
};
