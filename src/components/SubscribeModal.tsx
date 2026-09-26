"use client";

import { useActionState, useEffect, useState } from "react";
import { subscribe, type SubscribeState } from "@/app/actions";

const initialState: SubscribeState = { ok: false, message: "" };

export default function SubscribeModal({
  filamentId,
  label,
  trigger,
}: {
  filamentId?: string;
  label: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(subscribe, initialState);

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => setOpen(false), 1800);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="contents">
        {trigger}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="rise-in w-full max-w-sm rounded-[var(--radius)] border border-line bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 font-display text-2xl uppercase tracking-wide text-paper">
              Стежити за ціною
            </div>
            <p className="mb-4 text-sm text-muted">{label}</p>

            {state.ok ? (
              <p className="rounded-md border border-teal/40 bg-teal/10 p-3 text-sm text-teal">
                {state.message}
              </p>
            ) : (
              <form action={formAction} className="flex flex-col gap-3">
                <input type="hidden" name="filamentId" value={filamentId ?? ""} />
                <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-muted">
                  Email
                  <input
                    required
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    className="rounded-md border border-line bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-muted">
                  Повідомити, якщо ціна нижче за (₴, необовʼязково)
                  <input
                    type="number"
                    name="targetPrice"
                    min={0}
                    placeholder="напр. 450"
                    className="rounded-md border border-line bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus:border-accent"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-paper-dim">
                  <input type="checkbox" name="notifyAnySale" className="accent-accent" />
                  Або будь-яка знижка/акція
                </label>

                {state.message && !state.ok && (
                  <p className="text-sm text-danger">{state.message}</p>
                )}

                <div className="mt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="flex-1 rounded-md bg-accent px-4 py-2 font-display text-sm uppercase tracking-wide text-ink transition hover:brightness-110 disabled:opacity-60"
                  >
                    {pending ? "..." : "Підписатись"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md border border-line px-4 py-2 text-sm text-muted hover:text-paper"
                  >
                    Скасувати
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
