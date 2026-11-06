import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ConfirmOptions = {
    title: string;
    body?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Acción que borra algo: el botón de confirmar va en rojo. */
    destructive?: boolean;
};

/**
 * Diálogo de confirmación con el estilo de la app (sustituye a window.confirm, igual que NocturneConfirmDialog en
 * Android). Uso: `const [dialog, confirm] = useConfirm();` → pintar `{dialog}` y `if (await confirm({...}))`.
 * Escape o pulsar fuera cancelan; en móvil aparece como hoja inferior.
 */
export function useConfirm(): [ReactNode, (options: ConfirmOptions) => Promise<boolean>] {
    const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

    const confirm = useCallback(
        (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
        [],
    );

    const close = useCallback(
        (ok: boolean) => {
            pending?.resolve(ok);
            setPending(null);
        },
        [pending],
    );

    const dialog = pending ? <ConfirmDialog options={pending} onClose={close} /> : null;
    return [dialog, confirm];
}

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        confirmRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose(false);
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            previous?.focus?.();
        };
    }, [onClose]);

    return (
        <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose(false)}>
            <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body">
                <h2 id="confirm-title" className="dialog-title">
                    {options.title}
                </h2>
                {options.body && (
                    <p id="confirm-body" className="dialog-body">
                        {options.body}
                    </p>
                )}
                <div className="dialog-actions">
                    <button className="btn btn-ghost" onClick={() => onClose(false)}>
                        {options.cancelLabel ?? "Cancelar"}
                    </button>
                    <button ref={confirmRef} className={`btn ${options.destructive ? "btn-danger" : "btn-primary"}`} onClick={() => onClose(true)}>
                        {options.confirmLabel ?? "Aceptar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
