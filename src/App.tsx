import { useCallback, useEffect, useState } from "react";
import { ApiKeyGate } from "./components/ApiKeyGate";
import { LoginGate } from "./components/LoginGate";
import { getStoredCredentials, getStoredSession, clearCredentials, clearSession } from "./api/config";
import { api, setUnauthorizedHandler } from "./api/client";
import type { ModuleSettings } from "./api/types";
import { MODULES, MODULE_TABS } from "./modules";
import type { Tab } from "./modules";
import { DevicesPage } from "./pages/DevicesPage";
import { CarLogsPage } from "./pages/CarLogsPage";
import { ShoppingPage } from "./pages/ShoppingPage";
import { DestinationsPage } from "./pages/DestinationsPage";
import { WoffuManagerPage } from "./pages/WoffuManagerPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
    const [ready, setReady] = useState(() => getStoredCredentials() !== null);
    const [username, setUsername] = useState<string | null>(() => getStoredSession()?.username ?? null);
    const [modules, setModules] = useState<ModuleSettings | null>(null);
    const [tab, setTab] = useState<Tab | null>(null);

    const signOutLocally = useCallback(() => {
        clearSession();
        setUsername(null);
        setModules(null);
    }, []);

    useEffect(() => {
        setUnauthorizedHandler(signOutLocally);
        return () => setUnauthorizedHandler(null);
    }, [signOutLocally]);

    // Al haber sesión se cargan los módulos del usuario; si falla, se muestran todos (el valor por defecto).
    useEffect(() => {
        if (!username) return;
        let cancelled = false;
        api.modules()
            .then((m) => !cancelled && setModules(m))
            .catch(() => !cancelled && setModules(Object.fromEntries(MODULES.map((m) => [m.id, true]))));
        return () => {
            cancelled = true;
        };
    }, [username]);

    if (!ready) {
        return <ApiKeyGate onReady={() => setReady(true)} />;
    }
    if (!username) {
        return (
            <LoginGate
                onLoggedIn={setUsername}
                onChangeCredentials={() => {
                    clearCredentials();
                    setReady(false);
                }}
            />
        );
    }
    if (modules === null) {
        return <div style={{ padding: 32, color: "var(--color-text-secondary)" }}>Cargando…</div>;
    }

    const visibleTabs = [
        ...MODULES.filter((m) => modules[m.id] ?? true).flatMap((m) => MODULE_TABS[m.id]),
        { id: "settings" as Tab, label: "Ajustes" },
    ];
    // Si aún no se eligió pestaña, o la elegida pertenece a un módulo recién desactivado, se usa la primera visible.
    const activeTab = tab !== null && visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0].id;

    async function handleLogout() {
        try {
            await api.logout();
        } catch {
            // aunque falle el aviso al servidor, se cierra la sesión en este navegador
        }
        signOutLocally();
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
                    <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {visibleTabs.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                style={{
                                    background: activeTab === t.id ? "var(--color-surface)" : "transparent",
                                    color: activeTab === t.id ? "var(--color-text)" : "var(--color-text-secondary)",
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
                <span style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {username}
                    <button
                        onClick={handleLogout}
                        style={{ background: "transparent", border: "none", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                    >
                        Cerrar sesión
                    </button>
                </span>
            </header>

            <main style={{ flex: 1 }}>
                {activeTab === "devices" && <DevicesPage />}
                {activeTab === "carlogs" && <CarLogsPage />}
                {activeTab === "shopping" && <ShoppingPage />}
                {activeTab === "destinations" && <DestinationsPage />}
                {activeTab === "woffu" && <WoffuManagerPage />}
                {activeTab === "settings" && (
                    <SettingsPage username={username} modules={modules} onModulesChange={setModules} onLogout={handleLogout} />
                )}
            </main>
        </div>
    );
}
