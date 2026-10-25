/** Módulos del Hub (mismos ids que ModulesEndpoints.AllModules en la API y que la app Android). */
export type ModuleId = "carlocator" | "shopping" | "destinations" | "woffu";

export type Tab = "devices" | "carlogs" | "shopping" | "destinations" | "woffu" | "settings";

export const MODULES: { id: ModuleId; label: string; description: string; shared: boolean }[] = [
    { id: "carlocator", label: "BluetoothLocator", description: "Dispositivos Bluetooth y su actividad", shared: false },
    { id: "shopping", label: "Lista de la compra", description: "Compartida con todos los usuarios", shared: true },
    { id: "destinations", label: "Destinos", description: "Compartidos con todos los usuarios", shared: true },
    { id: "woffu", label: "WoffuManager", description: "Fichajes y diario de Woffu", shared: false },
];

/** Pestañas de cada módulo (BluetoothLocator tiene dos). */
export const MODULE_TABS: Record<ModuleId, { id: Tab; label: string }[]> = {
    carlocator: [
        { id: "devices", label: "Dispositivos" },
        { id: "carlogs", label: "Actividad BT" },
    ],
    shopping: [{ id: "shopping", label: "Lista de la compra" }],
    destinations: [{ id: "destinations", label: "Destinos" }],
    woffu: [{ id: "woffu", label: "WoffuManager" }],
};
