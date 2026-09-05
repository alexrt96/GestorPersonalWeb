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
        <div>
            <div style={{ display: "flex", gap: 4, padding: "12px 24px 0" }}>
                {SUB_TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        style={{
                            background: tab === t.id ? "var(--color-surface)" : "transparent",
                            color: tab === t.id ? "var(--color-text)" : "var(--color-text-secondary)",
                            border: "1px solid var(--color-border)",
                            borderBottom: tab === t.id ? "1px solid var(--color-surface)" : "1px solid var(--color-border)",
                            borderRadius: "8px 8px 0 0",
                            padding: "8px 16px",
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
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
