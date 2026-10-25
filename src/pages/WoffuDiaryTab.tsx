import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Diary, WorkdaySlotsInfo } from "../api/types";
import { Alert, EmptyState, SkeletonRows } from "../components/ui";
import { Icon } from "../components/Icon";

function pad(n: number): string {
    return n < 10 ? `0${n}` : String(n);
}

function toIsoDate(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hoursLabel(h: { values: string[] | null } | null): string {
    const v = h?.values?.[0];
    return v ? `${v}h` : "-";
}

function diaryStatusColor(d: Diary): string {
    if (d.isToday) return "#FF9800";
    if (d.isHoliday) return "#B45FC7";
    if (d.isWeekend) return "#7C95A6";
    if (d.absenceEvents && d.absenceEvents.length > 0) return "#2FB5A3";
    return "#7B88E8";
}

function diaryStatusText(d: Diary): string {
    if (d.isHoliday) return `🎉 ${d.calendarEvents?.holidayNames?.[0] ?? "Festivo"}`;
    if (d.isWeekend) return "🏖️ Fin de semana";
    if (d.absenceEvents && d.absenceEvents.length > 0) return `🌴 ${d.absenceEvents[0]?.description ?? "Ausencia"}`;
    if (d.in) return "💼 Día laborable";
    return "○ Sin datos";
}

export function WoffuDiaryTab() {
    const [cursor, setCursor] = useState(() => new Date());
    const [diaries, setDiaries] = useState<Diary[] | null>(null);
    const [totals, setTotals] = useState<{ scheduled: string; worked: string; diff: string; diffNeg: boolean } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Diary | null>(null);

    const monthTitle = useMemo(
        () => cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase()),
        [cursor]
    );

    function load() {
        setLoading(true);
        setError(null);
        const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        api.woffuDiary(toIsoDate(from), toIsoDate(to))
            .then((month) => {
                setDiaries(month.diaries);
                const diffVal = month.totalDifferenceTimeFormatted?.values?.[0] ?? "0";
                setTotals({
                    scheduled: hoursLabel(month.totalScheduleTimeFormatted),
                    worked: hoursLabel(month.totalWorkingTimeFormatted),
                    diff: `${diffVal}h`,
                    diffNeg: (Number(diffVal) || 0) < 0,
                });
            })
            .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo conectar con la API"))
            .finally(() => setLoading(false));
    }

    useEffect(load, [cursor]);

    return (
        <>
            <div className="month-nav">
                <button
                    className="btn icon-btn"
                    onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                    aria-label="Mes anterior"
                >
                    <Icon name="chevronLeft" />
                </button>
                <h2 className="month-title">{monthTitle}</h2>
                <button
                    className="btn icon-btn"
                    onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                    aria-label="Mes siguiente"
                >
                    <Icon name="chevronRight" />
                </button>
            </div>

            {totals && !error && (
                <div className="stats">
                    <Stat label="Programado" value={totals.scheduled} />
                    <Stat label="Trabajado" value={totals.worked} />
                    <Stat label="Diferencia" value={totals.diff} color={totals.diffNeg ? "var(--color-danger)" : "var(--color-success)"} />
                </div>
            )}

            {error && <Alert>{error}</Alert>}

            {loading ? (
                <div className="card flush">
                    <SkeletonRows rows={6} />
                </div>
            ) : (
                <div className="day-list">
                    {(diaries ?? []).map((d) => (
                        <DiaryCard key={d.diaryId} diary={d} onClick={() => setSelected(d)} />
                    ))}
                    {diaries !== null && diaries.length === 0 && (
                        <div className="card flush">
                            <EmptyState icon="inbox" title="No hay días en este mes" />
                        </div>
                    )}
                </div>
            )}

            {selected && (
                <DiaryDetail
                    diary={selected}
                    onClose={() => setSelected(null)}
                    onFixed={() => {
                        setSelected(null);
                        load();
                    }}
                />
            )}
        </>
    );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="stat">
            <div className="stat-value" style={{ color }}>
                {value}
            </div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

function DiaryCard({ diary, onClick }: { diary: Diary; onClick: () => void }) {
    const color = diaryStatusColor(diary);
    const date = new Date(diary.date + "T00:00:00");
    const hasTime = !!diary.in || !!diary.out;
    const worked = diary.workingTimeFormatted?.values?.[0];

    return (
        <button className={`day-card${diary.isToday ? " today" : ""}`} onClick={onClick}>
            <div className="day-badge" style={{ background: `${color}29`, color }}>
                <strong>{date.getDate()}</strong>
                <span>{date.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "").toUpperCase()}</span>
            </div>
            <div className="row-main">
                <div className="row-title">{diaryStatusText(diary)}</div>
                {hasTime && (
                    <div className="row-sub">
                        {diary.in?.slice(0, 5) ?? "--:--"} → {diary.out?.slice(0, 5) ?? "--:--"}
                    </div>
                )}
            </div>
            {worked && (worked !== "0" || hasTime) && <div style={{ fontSize: 14, fontWeight: 600 }}>{worked}h</div>}
            <Icon name="chevronRight" size={16} />
        </button>
    );
}

function DiaryDetail({ diary, onClose, onFixed }: { diary: Diary; onClose: () => void; onFixed: () => void }) {
    const [slots, setSlots] = useState<WorkdaySlotsInfo | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [fixError, setFixError] = useState<string | null>(null);

    useEffect(() => {
        if (diary.diarySummaryId <= 0 || diary.isWeekend || diary.isHoliday) return;
        setLoadingSlots(true);
        api.woffuSlots(diary.diarySummaryId)
            .then(setSlots)
            .catch(() => setSlots(null))
            .finally(() => setLoadingSlots(false));
    }, [diary]);

    // Cerrar con Escape
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    async function handleFix() {
        setFixing(true);
        setFixError(null);
        try {
            await api.fixWoffuDay(diary.diaryId, diary.diarySummaryId, diary.date);
            onFixed();
        } catch (err) {
            setFixError(err instanceof ApiError ? err.message : "No se pudo conectar con la API");
        } finally {
            setFixing(false);
        }
    }

    const date = new Date(diary.date + "T00:00:00");
    const realSlots = (slots?.slots ?? []).filter((s) => s.in || s.out);
    const diffVal = diary.differenceTimeFormatted?.values?.[0] ?? "0";
    const diffNum = Number(diffVal) || 0;

    const extraLines: string[] = [];
    diary.calendarEvents?.holidayNames?.forEach((n) => extraLines.push(`🎉 ${n}`));
    diary.absenceEvents?.forEach((a) => {
        extraLines.push(`🌴 ${a.description} (${a.startDate} → ${a.endDate})`);
    });
    if (diary.comments) extraLines.push(`💬 ${diary.comments}`);

    return (
        <div className="sheet-backdrop" onClick={onClose}>
            <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="sheet-grip" />
                <h2 className="sheet-title">{date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</h2>
                <div className="page-subtitle" style={{ marginBottom: 18 }}>
                    {diaryStatusText(diary)}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                    <TimeBlock label="Entrada" value={diary.in?.slice(0, 5) ?? "--:--"} />
                    <TimeBlock label="Salida" value={diary.out?.slice(0, 5) ?? "--:--"} align="right" />
                </div>

                <div className="stats" style={{ marginBottom: 18 }}>
                    <Stat label="Programado" value={hoursLabel(diary.scheduleTimeFormatted)} />
                    <Stat label="Trabajado" value={hoursLabel(diary.workingTimeFormatted)} />
                    <Stat
                        label="Diferencia"
                        value={diffNum > 0 ? `+${diffVal}h` : `${diffVal}h`}
                        color={diffNum < 0 ? "var(--color-danger)" : diffNum > 0 ? "var(--color-success)" : undefined}
                    />
                </div>

                {extraLines.length > 0 && (
                    <div className="page-subtitle" style={{ marginBottom: 16, whiteSpace: "pre-line" }}>
                        {extraLines.join("\n")}
                    </div>
                )}

                {loadingSlots ? (
                    <div className="page-subtitle">Cargando fichajes…</div>
                ) : realSlots.length === 0 ? (
                    <div className="page-subtitle">Sin fichajes registrados</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                        {realSlots.map((slot, idx) => (
                            <div key={idx} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <SlotChip label="Entrada" sign={slot.in} />
                                <SlotChip label="Salida" sign={slot.out} />
                            </div>
                        ))}
                    </div>
                )}

                {fixError && (
                    <div style={{ marginBottom: 12 }}>
                        <Alert>{fixError}</Alert>
                    </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                    {slots?.diaryBaseWorkDay?.startTime && (
                        <button className="btn btn-primary btn-block" onClick={handleFix} disabled={fixing}>
                            {fixing ? "Arreglando…" : "Arreglar día"}
                        </button>
                    )}
                    <button className="btn btn-block" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

function TimeBlock({ label, value, align }: { label: string; value: string; align?: "right" }) {
    return (
        <div style={{ textAlign: align }}>
            <div className="time-big">{value}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

function SlotChip({ label, sign }: { label: string; sign: { shortTrueTime: string | null; time: string | null; signId: number } | null }) {
    const isReal = (sign?.signId ?? 0) > 0;
    const time = (sign?.shortTrueTime ?? sign?.time ?? "--:--").slice(0, 5);
    const color = isReal ? "var(--color-success)" : "var(--color-danger)";
    return (
        <div className="slot-chip" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
            {label} {time} {isReal ? "✓" : "✗"}
        </div>
    );
}
