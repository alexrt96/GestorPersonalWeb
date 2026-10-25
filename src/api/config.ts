const BASE_URL_KEY = "gestorpersonal.apiBaseUrl";
const API_KEY_KEY = "gestorpersonal.apiKey";
const TOKEN_KEY = "gestorpersonal.sessionToken";
const USERNAME_KEY = "gestorpersonal.username";

export function getStoredCredentials(): { baseUrl: string; apiKey: string } | null {
    try {
        const baseUrl = localStorage.getItem(BASE_URL_KEY);
        const apiKey = localStorage.getItem(API_KEY_KEY);
        if (!baseUrl || !apiKey) return null;
        return { baseUrl, apiKey };
    } catch {
        return null;
    }
}

export function storeCredentials(baseUrl: string, apiKey: string): void {
    try {
        localStorage.setItem(BASE_URL_KEY, baseUrl.replace(/\/+$/, ""));
        localStorage.setItem(API_KEY_KEY, apiKey);
    } catch {
        // localStorage no disponible (modo privado, etc.) — la sesión seguirá pidiendo credenciales.
    }
}

export interface StoredSession {
    token: string;
    username: string;
}

export function getStoredSession(): StoredSession | null {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const username = localStorage.getItem(USERNAME_KEY);
        return token && username ? { token, username } : null;
    } catch {
        return null;
    }
}

export function storeSession(token: string, username: string): void {
    try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USERNAME_KEY, username);
    } catch {
        // localStorage no disponible: habrá que iniciar sesión de nuevo en cada carga.
    }
}

export function clearSession(): void {
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USERNAME_KEY);
    } catch {
        // no-op
    }
}

export function clearCredentials(): void {
    clearSession();
    try {
        localStorage.removeItem(BASE_URL_KEY);
        localStorage.removeItem(API_KEY_KEY);
    } catch {
        // no-op
    }
}
