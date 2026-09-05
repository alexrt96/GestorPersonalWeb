import { useState } from "react";
import { ApiKeyGate } from "./components/ApiKeyGate";
import { getStoredCredentials, clearCredentials } from "./api/config";
import { DevicesPage } from "./pages/DevicesPage";
import { CarLogsPage } from "./pages/CarLogsPage";
import { ShoppingPage } from "./pages/ShoppingPage";
import { WoffuLogsPage } from "./pages/WoffuLogsPage";

type Tab = "devices" | "carlogs" | "shopping" | "woffu";

const TABS: { id: Tab; label: string }[] = [
    { id: "devices", label: "Dispositivos" },
    { id: "carlogs", label: "Actividad BT" },
    { id: "shopping", label: "Lista de la compra" },
    { id: "woffu", label: "WoffuManager" },
];

export default function App() {
    const [ready, setReady] = useState(() => getStoredCredentials() !== null);
    const [tab, setTab] = useState<Tab>("devices");

    if (!ready) {
        return <ApiKeyGate onReady={() => setReady(true)} />;
    }

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <header
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 24px",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    <strong style={{ fontSize: 15 }}>GestorPersonal</strong>
                    <nav style={{ display: "flex", gap: 4 }}>
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                style={{
                                    background: tab === t.id ? "var(--color-surface)" : "transparent",
                                    color: tab === t.id ? "var(--color-text)" : "var(--color-text-secondary)",
                                    border: "none",
                                    borderRadius: 8,
                                    padding: "8px 14px",
                                    fontSize: 13,
                                    cursor: "pointer",
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <button
                    onClick={() => {
                        clearCredentials();
                        setReady(false);
                    }}
                    style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer" }}
                >
                    Cambiar credenciales
                </button>
            </header>

            <main style={{ flex: 1 }}>
                {tab === "devices" && <DevicesPage />}
                {tab === "carlogs" && <CarLogsPage />}
                {tab === "shopping" && <ShoppingPage />}
                {tab === "woffu" && <WoffuLogsPage />}
            </main>
        </div>
    );
}
