import { useCallback, useEffect, useRef, useState } from "react";
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
    const [menuOpen, setMenuOpen] = useState(false);
    const headerRef = useRef<HTMLElement>(null);

    const signOutLocally = useCallback(() => {
        clearSession();
        setUsername(null);
        setModules(null);
    }, []);

    useEffect(() => {
        setUnauthorizedHandler(signOutLocally);
        return () => setUnauthorizedHandler(null);
    }, [signOutLocally]);

    // Menú desplegable (móvil): se cierra con Escape o al pulsar fuera de la cabecera.
    useEffect(() => {
        if (!menuOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMenuOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [menuOpen]);

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
            <header className="app-header" ref={headerRef}>
                <strong className="app-brand">GestorPersonal</strong>
                {/* Solo visible en móvil: muestra la pestaña actual y abre el menú desplegable. */}
                <button
                    className="app-menu-btn"
                    aria-expanded={menuOpen}
                    aria-controls="app-menu"
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    <span className="app-menu-label">{visibleTabs.find((t) => t.id === activeTab)?.label}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                    </svg>
                </button>
                {/* En escritorio es transparente al layout (display: contents); en móvil es el desplegable. */}
                <div id="app-menu" className={`app-menu${menuOpen ? " open" : ""}`}>
                    <nav className="app-nav">
                        {visibleTabs.map((t) => (
                            <button
                                key={t.id}
                                className={`app-tab${activeTab === t.id ? " active" : ""}`}
                                onClick={() => {
                                    setTab(t.id);
                                    setMenuOpen(false);
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </nav>
                    <span className="app-user">
                        <span className="app-user-name">{username}</span>
                        <button className="app-logout" onClick={handleLogout}>
                            Cerrar sesión
                        </button>
                    </span>
                </div>
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
