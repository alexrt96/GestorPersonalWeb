const BASE_URL_KEY = "gestorpersonal.apiBaseUrl";
const API_KEY_KEY = "gestorpersonal.apiKey";

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

export function clearCredentials(): void {
    try {
        localStorage.removeItem(BASE_URL_KEY);
        localStorage.removeItem(API_KEY_KEY);
    } catch {
        // no-op
    }
}
