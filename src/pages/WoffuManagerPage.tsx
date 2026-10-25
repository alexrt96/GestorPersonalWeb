import { useState } from "react";
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
    const [tab, setTab] = useState<SubTab>("diary");

    return (
        <div className="page">
            <div className="segmented" role="tablist" aria-label="WoffuManager">
                {SUB_TABS.map((t) => (
                    <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
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
