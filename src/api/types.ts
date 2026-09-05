export interface DevicePoint {
    latitude: number;
    longitude: number;
    timestamp: number;
}

export interface Device {
    id: string;
    name: string;
    createdAt: number;
    point: DevicePoint | null;
}

export interface BlacklistEntry {
    macAddress: string;
    deviceName: string;
    addedAt: number;
}

export interface CarLog {
    id: number;
    timestamp: number;
    level: string;
    tag: string;
    message: string;
    deviceId: string | null;
}

export interface ShoppingItem {
    id: number;
    name: string;
    quantity: number;
    checked: boolean;
    createdAt: number;
    category: string | null;
}

export interface ShoppingTemplate {
    id: number;
    name: string;
    createdAt: number;
    itemCount: number;
}

export interface ShoppingTemplateItem {
    name: string;
    quantity: number;
}

export interface ShoppingTemplateDetail {
    id: number;
    name: string;
    createdAt: number;
    items: ShoppingTemplateItem[];
}

export interface WoffuLog {
    id: number;
    type: string;
    message: string;
    timestamp: number;
}
