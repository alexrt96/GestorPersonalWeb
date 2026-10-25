import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { storeSession } from "../api/config";
import { Alert } from "./ui";
import { Icon } from "./Icon";

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
            const result =
                mode === "login" ? await api.login(username.trim(), password) : await api.register(username.trim(), password);
            storeSession(result.token, result.user.username);
            onLoggedIn(result.user.username);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo conectar con la API");
        } finally {
            setBusy(false);
        }
    }

    const isLogin = mode === "login";

    return (
        <div className="auth-wrap">
            <form className="auth-card" onSubmit={handleSubmit}>
                <div className="auth-brand">
                    <span className="brand-mark">
                        <Icon name="layers" size={26} />
                    </span>
                    <div>
                        <h1 className="auth-title">{isLogin ? "Bienvenido" : "Crear usuario"}</h1>
                        <p className="auth-subtitle">
                            {isLogin
                                ? "Inicia sesión para ver tus dispositivos y tu WoffuManager."
                                : "Tus dispositivos y WoffuManager serán solo tuyos; la compra y los destinos son comunes."}
                        </p>
                    </div>
                </div>
                <label className="field">
                    Usuario
                    <input
                        className="input"
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </label>
                <label className="field">
                    Contraseña
                    <input
                        className="input"
                        type="password"
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        placeholder={isLogin ? undefined : "Mínimo 8 caracteres"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </label>
                {error && <Alert>{error}</Alert>}
                <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                    {busy ? "Un momento…" : isLogin ? "Entrar" : "Crear usuario y entrar"}
                </button>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <button
                        type="button"
                        className="link-btn"
                        onClick={() => {
                            setMode(isLogin ? "register" : "login");
                            setError(null);
                        }}
                    >
                        {isLogin ? "No tengo usuario: crear uno" : "Ya tengo usuario: iniciar sesión"}
                    </button>
                    <button type="button" className="link-btn" onClick={onChangeCredentials}>
                        Cambiar URL / API key
                    </button>
                </div>
            </form>
        </div>
    );
}
