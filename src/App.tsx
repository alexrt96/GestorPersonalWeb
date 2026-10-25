import { useCallback, useEffect, useRef, useState } from "react";
import { ApiKeyGate } from "./components/ApiKeyGate";
import { LoginGate } from "./components/LoginGate";
import { getStoredCredentials, getStoredSession, clearCredentials, clearSession } from "./api/config";
import { api, setUnauthorizedHandler } from "./api/client";
import type { ModuleSettings } from "./api/types";
import { MODULES, MODULE_TABS, SETTINGS_TAB } from "./modules";
import type { Tab } from "./modules";
import { Icon } from "./components/Icon";
import { navigate, useRoute } from "./hooks/useRoute";
import { DevicesPage } from "./pages/DevicesPage";
import { CarLogsPage } from "./pages/CarLogsPage";
import { ShoppingPage } from "./pages/ShoppingPage";
import { DestinationsPage } from "./pages/DestinationsPage";
import { WoffuManagerPage } from "./pages/WoffuManagerPage";
import { DeadlinesPage } from "./pages/DeadlinesPage";
import { TripsPage } from "./pages/TripsPage";
import { SettingsPage } from "./pages/SettingsPage";

const TAB_KEY = "gestorpersonal.tab";

/** La sección activa se recuerda entre recargas (útil en móvil, donde el navegador recarga las pestañas con frecuencia). */
function readStoredTab(): Tab | null {
    try {
        return localStorage.getItem(TAB_KEY) as Tab | null;
    } catch {
        return null;
    }
}

function storeTab(tab: Tab): void {
    try {
        localStorage.setItem(TAB_KEY, tab);
    } catch {
        // sin almacenamiento: simplemente no se recuerda
    }
}

/** Pestañas visibles según los módulos que el usuario tiene activados (más Ajustes). */
function visibleTabsFor(modules: ModuleSettings) {
    return [...MODULES.filter((m) => modules[m.id] ?? true).flatMap((m) => MODULE_TABS[m.id]), SETTINGS_TAB];
}

/** Pestaña a la que ir cuando la URL no indica una válida: la última usada si sigue visible, si no la primera. */
function fallbackTab(visible: { id: Tab }[]): Tab {
    const stored = readStoredTab();
    return stored !== null && visible.some((t) => t.id === stored) ? stored : visible[0].id;
}

export default function App() {
    const [ready, setReady] = useState(() => getStoredCredentials() !== null);
    const [username, setUsername] = useState<string | null>(() => getStoredSession()?.username ?? null);
    const [modules, setModules] = useState<ModuleSettings | null>(null);
    const route = useRoute();
    const urlTab = route[0];
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

    // La URL manda: sin pestaña válida (primera visita, enlace viejo, módulo desactivado) se corrige sustituyendo la
    // entrada actual del historial, para que "atrás" no vuelva a una dirección que se corrige sola.
    useEffect(() => {
        if (!username || modules === null) return;
        const visible = visibleTabsFor(modules);
        if (!visible.some((t) => t.id === urlTab)) navigate(`/${fallbackTab(visible)}`, true);
    }, [username, modules, urlTab]);

    // Cada pantalla nueva empieza arriba (cambiar el hash no desplaza la página por sí solo).
    const routeKey = route.join("/");
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [routeKey]);

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
        return (
            <div className="auth-wrap">
                <div className="brand-mark" aria-label="Cargando">
                    <Icon name="layers" size={18} />
                </div>
            </div>
        );
    }

    const visibleTabs = visibleTabsFor(modules);
    // Si la URL no trae una pestaña válida se usa la de reserva (el efecto de arriba corrige la dirección).
    const activeTab: Tab = visibleTabs.some((t) => t.id === urlTab) ? (urlTab as Tab) : fallbackTab(visibleTabs);

    async function handleLogout() {
        try {
            await api.logout();
        } catch {
            // aunque falle el aviso al servidor, se cierra la sesión en este navegador
        }
        signOutLocally();
    }

    return (
        <div className="app-shell">
            <header className="app-header" ref={headerRef}>
                <div className="app-header-inner">
                    <div className="brand">
                        <span className="brand-mark">
                            <Icon name="layers" size={17} />
                        </span>
                        GestorPersonal
                    </div>
                    {/* Solo visible en móvil: muestra la pestaña actual y abre el menú desplegable. */}
                    <button
                        className="app-menu-btn"
                        aria-expanded={menuOpen}
                        aria-controls="app-menu"
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        <span className="app-menu-label">{visibleTabs.find((t) => t.id === activeTab)?.label}</span>
                        <Icon name={menuOpen ? "close" : "menu"} />
                    </button>
                    {/* En escritorio es transparente al layout (display: contents); en móvil es el desplegable. */}
                    <div id="app-menu" className={`app-menu${menuOpen ? " open" : ""}`}>
                        <nav className="app-nav" aria-label="Secciones">
                            {visibleTabs.map((t) => (
                                <button
                                    key={t.id}
                                    className={`app-tab${activeTab === t.id ? " active" : ""}`}
                                    aria-current={activeTab === t.id ? "page" : undefined}
                                    onClick={() => {
                                        storeTab(t.id);
                                        navigate(`/${t.id}`);
                                        setMenuOpen(false);
                                    }}
                                >
                                    <Icon name={t.icon} size={17} />
                                    {t.label}
                                </button>
                            ))}
                        </nav>
                        <div className="app-user">
                            <span className="avatar" aria-hidden="true">
                                {username.charAt(0)}
                            </span>
                            <span className="app-user-name">{username}</span>
                            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                                <Icon name="logout" size={16} />
                                Salir
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="app-main">
                {activeTab === "devices" && <DevicesPage />}
                {activeTab === "carlogs" && <CarLogsPage />}
                {activeTab === "shopping" && <ShoppingPage />}
                {activeTab === "destinations" && <DestinationsPage />}
                {activeTab === "woffu" && <WoffuManagerPage />}
                {activeTab === "deadlines" && <DeadlinesPage />}
                {activeTab === "trips" && <TripsPage />}
                {activeTab === "settings" && (
                    <SettingsPage username={username} modules={modules} onModulesChange={setModules} onLogout={handleLogout} />
                )}
            </main>
        </div>
    );
}
