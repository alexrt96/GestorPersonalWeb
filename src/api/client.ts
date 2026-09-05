import { getStoredCredentials } from "./config";
import type {
    BlacklistEntry,
    CarLog,
    Device,
    ShoppingItem,
    ShoppingTemplate,
    ShoppingTemplateDetail,
    WoffuLog,
} from "./types";

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const creds = getStoredCredentials();
    if (!creds) throw new ApiError(401, "Faltan credenciales de la API");

    const res = await fetch(`${creds.baseUrl}${path}`, {
        ...init,
        headers: {
            "x-api-key": creds.apiKey,
            ...(init?.body ? { "Content-Type": "application/json" } : {}),
            ...init?.headers,
        },
    });

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new ApiError(res.status, body || `Error ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

export async function checkHealth(baseUrl: string): Promise<boolean> {
    try {
        const res = await fetch(`${baseUrl}/api/health`);
        return res.ok;
    } catch {
        return false;
    }
}

export const api = {
    devices: () => request<Device[]>("/api/devices"),
    blacklist: () => request<BlacklistEntry[]>("/api/blacklist"),
    carLogs: (params?: { level?: string; deviceId?: string; limit?: number }) => {
        const qs = new URLSearchParams();
        if (params?.level) qs.set("level", params.level);
        if (params?.deviceId) qs.set("deviceId", params.deviceId);
        if (params?.limit) qs.set("limit", String(params.limit));
        const suffix = qs.toString() ? `?${qs}` : "";
        return request<CarLog[]>(`/api/logs${suffix}`);
    },
    shoppingItems: () => request<ShoppingItem[]>("/api/shopping/items"),
    shoppingTemplates: () => request<ShoppingTemplate[]>("/api/shopping/templates"),
    shoppingTemplateDetail: (id: number) => request<ShoppingTemplateDetail>(`/api/shopping/templates/${id}`),
    woffuLogs: (limit = 200) => request<WoffuLog[]>(`/api/woffu/logs?limit=${limit}`),
};
