import { navigate, useRoute } from "../hooks/useRoute";
import { WoffuDiaryTab } from "./WoffuDiaryTab";
import { WoffuSettingsTab } from "./WoffuSettingsTab";
import { WoffuLogsPage } from "./WoffuLogsPage";

type SubTab = "diary" | "settings" | "logs";

const SUB_TABS: { id: SubTab; label: string }[] = [
    { id: "diary", label: "Diario" },
    { id: "settings", label: "Ajustes" },
    { id: "logs", label: "Actividad" },
];

export function WoffuManagerPage() {
    // Rutas: `#/woffu/diary` (por defecto), `#/woffu/settings` y `#/woffu/logs`.
    const route = useRoute();
    const tab: SubTab = SUB_TABS.find((t) => t.id === route[1])?.id ?? "diary";

    return (
        <div className="page">
            <div className="segmented" role="tablist" aria-label="WoffuManager">
                {SUB_TABS.map((t) => (
                    <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "active" : ""} onClick={() => navigate(`/woffu/${t.id}`)}>
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === "diary" && <WoffuDiaryTab />}
            {tab === "settings" && <WoffuSettingsTab />}
            {tab === "logs" && <WoffuLogsPage />}
        </div>
    );
}
