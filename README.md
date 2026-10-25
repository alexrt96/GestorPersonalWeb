# GestorPersonalWeb

Cliente web (React 19 + TypeScript + Vite) de **GestorPersonal**. Habla con la misma API que la app Android (`GestorPersonalApi`, ver su README para el contrato REST) y muestra solo los módulos que el usuario tiene activados (`/api/me/modules`, los mismos ids que la app).

## Secciones

| Pestaña | Qué hace |
|---|---|
| Dispositivos / Actividad BT | **Solo lectura** de BluetoothLocator: dispositivos con su último punto en un mapa (Leaflet + OpenStreetMap) y diario de actividad. |
| Lista de la compra | Lista compartida: añadir, marcar, cambiar cantidad, **editar nombre y categoría** (lápiz → edición en línea), borrar con **Deshacer** (barra inferior, 10 s), quitar marcados, plantillas (se guardan con la categoría de cada producto). Une duplicados (lo decide la API). Autocompleta el nombre con productos usados antes (y pone su categoría habitual). Se refresca cada 20 s y al volver a la pestaña. Detalle en `GestorPersonal/docs/modules/SHOPPINGLIST.md`. |
| Destinos | Añadir un lugar por nombre: si hay varios resultados (Nominatim) se elige el correcto en una tarjeta; verlos en un mapa (los visitados en verde), **editar** nombre / nota / categoría (lápiz → edición en línea), marcarlos como **visitados** (casilla) y borrarlos. |
| WoffuManager | Ajustes (token / userId), diario mensual con detalle por día y "Arreglar día", y registro de actividad. La activación de la automatización se gestiona solo desde el móvil. |
| Vencimientos | Vencimientos y recordatorios **solo tuyos**: alta (título, fecha, aviso previo, repetición, categoría, nota), lista agrupada en Vencidos / Próximos / Más adelante / Hechos con insignia de días restantes, casilla "hecho" (si se repite, pasa a la siguiente fecha), edición en línea y borrado. **No avisa**: las notificaciones las emite la app del móvil. Detalle en `GestorPersonal/docs/modules/DEADLINES.md`. |
| Viajes | Viajes compartidos con todos los usuarios: crear (nombre, destino, fechas, nota), lista En curso / Próximos / Pasados y vista de detalle con **itinerario** por días (paradas con hora opcional, edición en línea) y **lista de equipaje** con marcado. Detalle en `GestorPersonal/docs/modules/TRIPS.md`. |
| Ajustes | Activar/desactivar módulos y cerrar sesión. |

## Puesta en marcha

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # tsc -b + vite build
npm run lint     # oxlint
```

Al abrirla pide la **URL de la API** y la **API key** (se guardan en `localStorage`) y después usuario y contraseña (sesión con `Authorization: Bearer`). Un `401` cierra la sesión.

## Estructura

- `src/api/` — `client.ts` (todas las llamadas), `types.ts`, `config.ts` (credenciales y sesión en `localStorage`).
- `src/hooks/usePolling.ts` — carga datos con refresco manual y por intervalo; solo mientras la pestaña está visible, y refresca al instante al volver a ella.
- `src/pages/` — una página por pestaña. `src/modules.ts` — módulos y pestañas. `src/components/` — `ui.tsx`, `Icon.tsx` (iconos de trazo en línea), `LoginGate`, `ApiKeyGate`.
- `src/index.css` — sistema de diseño Nocturne (tokens en `:root`, tema oscuro igual que la app).
