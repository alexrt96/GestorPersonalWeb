import { useState } from "react";
import type { FormEvent } from "react";
import type { TripInput } from "../api/types";

/** Formulario común de alta y edición de un viaje. */
export function TripForm({
    initial,
    submitLabel,
    busy,
    onSubmit,
    onCancel,
}: {
    initial: TripInput;
    submitLabel: string;
    busy: boolean;
    onSubmit: (input: TripInput) => void;
    onCancel?: () => void;
}) {
    const [value, setValue] = useState(initial);
    const set = <K extends keyof TripInput>(key: K, v: TripInput[K]) => setValue((prev) => ({ ...prev, [key]: v }));
    const valid = value.name.trim() !== "" && value.destination.trim() !== "" && value.startDate !== "" && value.endDate !== "" && value.endDate >= value.startDate;

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!valid) return;
        onSubmit({ ...value, name: value.name.trim(), destination: value.destination.trim(), note: value.note.trim() });
    }

    return (
        <form className="form-stack" onSubmit={handleSubmit}>
            <div className="form-row">
                <input
                    className="input"
                    placeholder="Nombre del viaje"
                    aria-label="Nombre del viaje"
                    maxLength={120}
                    value={value.name}
                    onChange={(e) => set("name", e.target.value)}
                    autoFocus={onCancel !== undefined}
                />
                <input
                    className="input"
                    placeholder="Destino"
                    aria-label="Destino"
                    maxLength={120}
                    value={value.destination}
                    onChange={(e) => set("destination", e.target.value)}
                />
            </div>
            <div className="form-row">
                <input
                    type="date"
                    className="input"
                    aria-label="Fecha de inicio"
                    value={value.startDate}
                    onChange={(e) => {
                        const start = e.target.value;
                        setValue((prev) => ({ ...prev, startDate: start, endDate: prev.endDate < start ? start : prev.endDate }));
                    }}
                />
                <input
                    type="date"
                    className="input"
                    aria-label="Fecha de fin"
                    min={value.startDate}
                    value={value.endDate}
                    onChange={(e) => set("endDate", e.target.value)}
                />
            </div>
            <div className="form-row" style={{ flexWrap: "nowrap" }}>
                <input
                    className="input"
                    placeholder="Nota (opcional)"
                    aria-label="Nota"
                    maxLength={500}
                    value={value.note}
                    onChange={(e) => set("note", e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={busy || !valid}>
                    {submitLabel}
                </button>
                {onCancel && (
                    <button type="button" className="btn" onClick={onCancel} disabled={busy}>
                        Cancelar
                    </button>
                )}
            </div>
        </form>
    );
}
