"use client";

import { useEffect, useRef } from "react";

export default function PrintToolbar() {
  const printed = useRef(false);

  useEffect(() => {
    if (printed.current) return;
    printed.current = true;
    // Apre il dialogo di stampa una volta caricata la pagina.
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="no-print mb-6 flex items-center justify-between gap-3">
      <button
        onClick={() => window.close()}
        className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:border-brand-dark hover:bg-brand-tint"
      >
        ← Chiudi
      </button>
      <button
        onClick={() => window.print()}
        className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-brand hover:text-ink"
      >
        Stampa / Salva PDF
      </button>
    </div>
  );
}
