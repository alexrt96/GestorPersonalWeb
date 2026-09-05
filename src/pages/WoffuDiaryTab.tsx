import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Diary, WorkdaySlotsInfo } from "../api/types";
import { shared } from "../components/shared";

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
    if (d.isHoliday) return "#9C27B0";
    if (d.isWeekend) return "#607D8B";
    if (d.absenceEvents && d.absenceEvents.length > 0) return "#00897B";
    return "#3F51B5";
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
        <div style={shared.page}>
            <div style={shared.headerRow}>
                <button style={shared.refreshButton} onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>
                    ←
                </button>
                <h1 style={{ ...shared.pageTitle, flex: 1, textAlign: "center" }}>{monthTitle}</h1>
                <button style={shared.refreshButton} onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>
                    →
                </button>
            </div>

            {totals && !error && (
                <div style={{ display: "flex", justifyContent: "space-around", ...shared.card }}>
                    <Stat label="Programado" value={totals.scheduled} />
                    <Stat label="Trabajado" value={totals.worked} />
                    <Stat label="Diferencia" value={totals.diff} color={totals.diffNeg ? "var(--color-danger)" : "var(--color-success)"} />
                </div>
            )}

            {error && <div style={shared.errorBox}>{error}</div>}

            {loading ? (
                <div style={shared.empty}>Cargando…</div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(diaries ?? []).map((d) => (
                        <DiaryCard key={d.diaryId} diary={d} onClick={() => setSelected(d)} />
                    ))}
                    {diaries !== null && diaries.length === 0 && <div style={shared.empty}>No hay días en este mes.</div>}
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
        </div>
    );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, color: color ?? "var(--color-text)" }}>{value}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</div>
        </div>
    );
}

function DiaryCard({ diary, onClick }: { diary: Diary; onClick: () => void }) {
    const color = diaryStatusColor(diary);
    const date = new Date(diary.date + "T00:00:00");
    const hasTime = !!diary.in || !!diary.out;
    const worked = diary.workingTimeFormatted?.values?.[0];

    return (
        <div
            onClick={onClick}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: 14,
                borderRadius: 10,
                cursor: "pointer",
                background: diary.isToday ? "rgba(145,132,217,0.08)" : "var(--color-surface)",
                border: "1px solid var(--color-border)",
            }}
        >
            <div
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: `${color}29`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                <div style={{ color, fontWeight: 700, fontSize: 15 }}>{date.getDate()}</div>
                <div style={{ color, fontSize: 10 }}>{date.toLocaleDateString("es-ES", { weekday: "short" }).toUpperCase()}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14 }}>{diaryStatusText(diary)}</div>
                {hasTime && (
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {diary.in?.slice(0, 5) ?? "--:--"} → {diary.out?.slice(0, 5) ?? "--:--"}
                    </div>
                )}
            </div>
            {worked && (worked !== "0" || hasTime) && <div style={{ fontSize: 14 }}>{worked}h</div>}
        </div>
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
        <div style={overlayStyles.backdrop} onClick={onClose}>
            <div style={overlayStyles.sheet} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>
                    {date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                </h2>
                <div style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 16 }}>{diaryStatusText(diary)}</div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                    <TimeBlock label="Entrada" value={diary.in?.slice(0, 5) ?? "--:--"} />
                    <TimeBlock label="Salida" value={diary.out?.slice(0, 5) ?? "--:--"} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                    <Stat label="Programado" value={hoursLabel(diary.scheduleTimeFormatted)} />
                    <Stat label="Trabajado" value={hoursLabel(diary.workingTimeFormatted)} />
                    <Stat
                        label="Diferencia"
                        value={diffNum > 0 ? `+${diffVal}h` : `${diffVal}h`}
                        color={diffNum < 0 ? "var(--color-danger)" : diffNum > 0 ? "var(--color-success)" : undefined}
                    />
                </div>

                {extraLines.length > 0 && (
                    <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14, whiteSpace: "pre-line" }}>
                        {extraLines.join("\n")}
                    </div>
                )}

                {loadingSlots ? (
                    <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Cargando fichajes…</div>
                ) : realSlots.length === 0 ? (
                    <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Sin fichajes registrados</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                        {realSlots.map((slot, idx) => (
                            <div key={idx} style={{ display: "flex", gap: 10 }}>
                                <SlotChip label="Entrada" sign={slot.in} />
                                <SlotChip label="Salida" sign={slot.out} />
                            </div>
                        ))}
                    </div>
                )}

                {fixError && <div style={{ ...shared.errorBox, marginBottom: 12 }}>{fixError}</div>}

                {slots?.diaryBaseWorkDay?.startTime && (
                    <button style={overlayStyles.fixButton} onClick={handleFix} disabled={fixing}>
                        {fixing ? "Arreglando…" : "Arreglar día"}
                    </button>
                )}

                <button style={overlayStyles.closeButton} onClick={onClose}>
                    Cerrar
                </button>
            </div>
        </div>
    );
}

function TimeBlock({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</div>
        </div>
    );
}

function SlotChip({ label, sign }: { label: string; sign: { shortTrueTime: string | null; time: string | null; signId: number } | null }) {
    const isReal = (sign?.signId ?? 0) > 0;
    const time = (sign?.shortTrueTime ?? sign?.time ?? "--:--").slice(0, 5);
    const color = isReal ? "var(--color-success)" : "var(--color-danger)";
    return (
        <div style={{ background: `${color}1f`, color, borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
            {label} {time} {isReal ? "✓" : "✗"}
        </div>
    );
}

const overlayStyles: Record<string, React.CSSProperties> = {
    backdrop: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 50,
    },
    sheet: {
        background: "var(--color-surface)",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 24,
        width: "100%",
        maxWidth: 480,
        maxHeight: "85vh",
        overflowY: "auto",
    },
    fixButton: {
        width: "100%",
        background: "transparent",
        border: "1px solid var(--color-accent)",
        color: "var(--color-accent)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 14,
        cursor: "pointer",
        marginBottom: 10,
    },
    closeButton: {
        width: "100%",
        background: "transparent",
        border: "1px solid var(--color-border)",
        color: "var(--color-text-secondary)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 14,
        cursor: "pointer",
    },
};
