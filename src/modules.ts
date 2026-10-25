import type { IconName } from "./components/Icon";

/** Módulos del Hub (mismos ids que ModulesEndpoints.AllModules en la API y que la app Android). */
export type ModuleId = "carlocator" | "shopping" | "destinations" | "woffu";

export type Tab = "devices" | "carlogs" | "shopping" | "destinations" | "woffu" | "settings";

export const MODULES: { id: ModuleId; label: string; description: string; shared: boolean; icon: IconName }[] = [
    { id: "carlocator", label: "BluetoothLocator", description: "Dispositivos Bluetooth y su actividad", shared: false, icon: "bluetooth" },
    { id: "shopping", label: "Lista de la compra", description: "Compartida con todos los usuarios", shared: true, icon: "cart" },
    { id: "destinations", label: "Destinos", description: "Compartidos con todos los usuarios", shared: true, icon: "pin" },
    { id: "woffu", label: "WoffuManager", description: "Fichajes y diario de Woffu", shared: false, icon: "briefcase" },
];

export interface TabInfo {
    id: Tab;
    label: string;
    icon: IconName;
}

/** Pestañas de cada módulo (BluetoothLocator tiene dos). */
export const MODULE_TABS: Record<ModuleId, TabInfo[]> = {
    carlocator: [
        { id: "devices", label: "Dispositivos", icon: "bluetooth" },
        { id: "carlogs", label: "Actividad BT", icon: "activity" },
    ],
    shopping: [{ id: "shopping", label: "Lista de la compra", icon: "cart" }],
    destinations: [{ id: "destinations", label: "Destinos", icon: "pin" }],
    woffu: [{ id: "woffu", label: "WoffuManager", icon: "briefcase" }],
};

export const SETTINGS_TAB: TabInfo = { id: "settings", label: "Ajustes", icon: "sliders" };
