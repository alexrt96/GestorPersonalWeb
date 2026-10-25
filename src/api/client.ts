import { clearSession, getStoredCredentials, getStoredSession } from "./config";
import type {
    AuthResponse,
    BlacklistEntry,
    CarLog,
    Deadline,
    DeadlineInput,
    Destination,
    PlaceCandidate,
    Device,
    DiaryMonth,
    ModuleSettings,
    ShoppingItem,
    ShoppingSuggestion,
    ShoppingTemplate,
    ShoppingTemplateDetail,
    ShoppingTemplateItem,
    Trip,
    TripDetail,
    TripInput,
    TripPackingItem,
    TripStop,
    TripStopInput,
    WoffuLog,
    WoffuSettings,
    WorkdaySlotsInfo,
} from "./types";

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

let unauthorizedHandler: (() => void) | null = null;

/** Registra qué hacer cuando la API rechaza la sesión (token caducado o revocado). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
    unauthorizedHandler = handler;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const creds = getStoredCredentials();
    if (!creds) throw new ApiError(401, "Faltan credenciales de la API");
    const session = getStoredSession();

    const res = await fetch(`${creds.baseUrl}${path}`, {
        ...init,
        headers: {
            "x-api-key": creds.apiKey,
            ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
            ...(init?.body ? { "Content-Type": "application/json" } : {}),
            ...init?.headers,
        },
    });

    if (res.status === 401 && session) {
        clearSession();
        unauthorizedHandler?.();
    }

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        let message = body;
        try {
            const parsed = JSON.parse(body);
            message = parsed?.error ?? parsed?.message ?? body;
        } catch {
            // no era JSON, se usa el texto tal cual
        }
        throw new ApiError(res.status, message || `Error ${res.status}`);
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

/**
 * Despierta GestorPersonalApi (Render free duerme el servicio) y la BD (Neon) nada más abrir
 * el visor. Fire-and-forget: /api/health es público y el resultado se ignora.
 */
export function wakeUpApi(): void {
    const creds = getStoredCredentials();
    if (!creds) return;
    fetch(`${creds.baseUrl}/api/health`).catch(() => {
        // da igual si falla o tarda: solo buscamos que el servidor arranque
    });
}

async function authRequest(path: "/api/auth/login" | "/api/auth/register", username: string, password: string): Promise<AuthResponse> {
    const creds = getStoredCredentials();
    if (!creds) throw new ApiError(401, "Faltan credenciales de la API");

    let res: Response;
    try {
        res = await fetch(`${creds.baseUrl}${path}`, {
            method: "POST",
            headers: { "x-api-key": creds.apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
    } catch {
        throw new ApiError(0, "No se pudo conectar con la API");
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
        throw new ApiError(res.status, body?.message ?? (res.status === 401 ? "La API key no es válida" : `Error ${res.status}`));
    }
    return body as AuthResponse;
}

export const api = {
    login: (username: string, password: string) => authRequest("/api/auth/login", username, password),
    register: (username: string, password: string) => authRequest("/api/auth/register", username, password),
    logout: () => request<void>("/api/auth/logout", { method: "POST" }),
    modules: () => request<ModuleSettings>("/api/me/modules"),
    saveModules: (changes: ModuleSettings) =>
        request<ModuleSettings>("/api/me/modules", { method: "PUT", body: JSON.stringify(changes) }),


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
    shoppingSuggestions: (q: string) =>
        request<ShoppingSuggestion[]>(`/api/shopping/suggestions?q=${encodeURIComponent(q)}`),
    shoppingTemplates: () => request<ShoppingTemplate[]>("/api/shopping/templates"),
    shoppingTemplateDetail: (id: number) => request<ShoppingTemplateDetail>(`/api/shopping/templates/${id}`),
    addShoppingItem: (item: { name: string; quantity: number; category: string | null }) =>
        request<ShoppingItem>("/api/shopping/items", { method: "POST", body: JSON.stringify(item) }),
    patchShoppingItem: (id: number, patch: { checked?: boolean; quantity?: number; name?: string; category?: string }) =>
        request<void>(`/api/shopping/items/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    restoreShoppingItems: (items: Pick<ShoppingItem, "name" | "quantity" | "checked" | "createdAt" | "category">[]) =>
        request<void>("/api/shopping/items/restore", { method: "POST", body: JSON.stringify(items) }),
    deleteShoppingItem: (id: number) => request<void>(`/api/shopping/items/${id}`, { method: "DELETE" }),
    clearCheckedShoppingItems: () => request<void>("/api/shopping/items/clear-checked", { method: "POST" }),
    createShoppingTemplate: (name: string, items: ShoppingTemplateItem[]) =>
        request<ShoppingTemplate>("/api/shopping/templates", { method: "POST", body: JSON.stringify({ name, items }) }),
    deleteShoppingTemplate: (id: number) => request<void>(`/api/shopping/templates/${id}`, { method: "DELETE" }),
    applyShoppingTemplate: (id: number) =>
        request<{ appliedItems: number }>(`/api/shopping/templates/${id}/apply`, { method: "POST" }),

    destinations: () => request<Destination[]>("/api/destinations"),
    searchPlaces: (q: string) => request<PlaceCandidate[]>(`/api/destinations/search?q=${encodeURIComponent(q)}`),
    /** Con `place` se guarda ese lugar tal cual; sin él, la API geocodifica `name` y usa el primer resultado. */
    addDestination: (name: string, place?: PlaceCandidate) =>
        request<Destination>("/api/destinations", {
            method: "POST",
            body: JSON.stringify(place ? { name, displayName: place.displayName, latitude: place.latitude, longitude: place.longitude } : { name }),
        }),
    /** Una nota o categoría "" la borra. */
    updateDestination: (id: number, patch: { name?: string; note?: string; category?: string; visited?: boolean }) =>
        request<Destination>(`/api/destinations/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    deleteDestination: (id: number) => request<void>(`/api/destinations/${id}`, { method: "DELETE" }),

    deadlines: () => request<Deadline[]>("/api/deadlines"),
    addDeadline: (input: DeadlineInput) =>
        request<Deadline>("/api/deadlines", { method: "POST", body: JSON.stringify(input) }),
    /** Una nota o categoría "" la borra. */
    updateDeadline: (id: number, patch: Partial<DeadlineInput> & { done?: boolean }) =>
        request<Deadline>(`/api/deadlines/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    /** Sin repetición lo cierra; con repetición lo reabre en la siguiente fecha. */
    completeDeadline: (id: number) => request<Deadline>(`/api/deadlines/${id}/complete`, { method: "POST" }),
    deleteDeadline: (id: number) => request<void>(`/api/deadlines/${id}`, { method: "DELETE" }),

    trips: () => request<Trip[]>("/api/trips"),
    trip: (id: number) => request<TripDetail>(`/api/trips/${id}`),
    addTrip: (input: TripInput) => request<Trip>("/api/trips", { method: "POST", body: JSON.stringify(input) }),
    /** Una nota "" la borra. */
    updateTrip: (id: number, patch: Partial<TripInput>) =>
        request<Trip>(`/api/trips/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    deleteTrip: (id: number) => request<void>(`/api/trips/${id}`, { method: "DELETE" }),
    /** Lugares que encajan con `q` (Nominatim vía la API), para elegir dónde situar una parada en el mapa. */
    searchTripPlaces: (q: string) => request<PlaceCandidate[]>(`/api/trips/places/search?q=${encodeURIComponent(q)}`),
    /** Con `place` la parada queda situada en el mapa; sin él, no tiene ubicación. */
    addTripStop: (tripId: number, input: TripStopInput, place?: PlaceCandidate) =>
        request<TripStop>(`/api/trips/${tripId}/stops`, {
            method: "POST",
            body: JSON.stringify(place ? { ...input, latitude: place.latitude, longitude: place.longitude } : input),
        }),
    /** Hora, lugar o nota "" los borra. `location`: un lugar la fija, "clear" la quita y sin él no se toca. */
    updateTripStop: (tripId: number, stopId: number, patch: Partial<TripStopInput>, location?: PlaceCandidate | "clear") =>
        request<TripStop>(`/api/trips/${tripId}/stops/${stopId}`, {
            method: "PATCH",
            body: JSON.stringify(
                location === "clear"
                    ? { ...patch, clearLocation: true }
                    : location
                      ? { ...patch, latitude: location.latitude, longitude: location.longitude }
                      : patch,
            ),
        }),
    deleteTripStop: (tripId: number, stopId: number) =>
        request<void>(`/api/trips/${tripId}/stops/${stopId}`, { method: "DELETE" }),
    addPackingItem: (tripId: number, name: string) =>
        request<TripPackingItem>(`/api/trips/${tripId}/packing`, { method: "POST", body: JSON.stringify({ name }) }),
    updatePackingItem: (tripId: number, itemId: number, patch: { name?: string; checked?: boolean }) =>
        request<TripPackingItem>(`/api/trips/${tripId}/packing/${itemId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    deletePackingItem: (tripId: number, itemId: number) =>
        request<void>(`/api/trips/${tripId}/packing/${itemId}`, { method: "DELETE" }),
    uncheckAllPacking: (tripId: number) => request<void>(`/api/trips/${tripId}/packing/uncheck-all`, { method: "POST" }),

    woffuLogs: (limit = 200) => request<WoffuLog[]>(`/api/woffu/logs?limit=${limit}`),

    woffuSettings: () => request<WoffuSettings>("/api/woffu/settings"),
    saveWoffuSettings: (settings: WoffuSettings) =>
        request<WoffuSettings>("/api/woffu/settings", { method: "PUT", body: JSON.stringify(settings) }),
    woffuDiary: (fromDate: string, toDate: string) =>
        request<DiaryMonth>(`/api/woffu/diary?fromDate=${fromDate}&toDate=${toDate}`),
    woffuSlots: (diarySummaryId: number) =>
        request<WorkdaySlotsInfo>(`/api/woffu/diary/slots/${diarySummaryId}`),
    fixWoffuDay: (diaryId: number, diarySummaryId: number, date: string) =>
        request<{ success: boolean }>(`/api/woffu/diary/${diaryId}/fix`, {
            method: "POST",
            body: JSON.stringify({ diarySummaryId, date }),
        }),
};
