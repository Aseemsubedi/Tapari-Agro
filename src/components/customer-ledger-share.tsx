"use client";

import { useState } from "react";
import { customerWhatsAppHref } from "@/lib/orders";

export function CustomerLedgerShare({
  phone,
  message,
  invoiceHref,
  canPrintHere = false,
}: {
  phone: string;
  message: string;
  invoiceHref: string;
  /** When true, Print uses window.print() (invoice page). */
  canPrintHere?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLedger() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const waHref = phone ? customerWhatsAppHref(phone, message) : null;

  return (
    <div className="flex flex-wrap gap-2">
      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg bg-pine px-3.5 py-2 text-sm font-semibold text-white"
        >
          Share on WhatsApp
        </a>
      ) : null}
      <button
        type="button"
        onClick={copyLedger}
        className="inline-flex items-center rounded-lg border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold text-ink"
      >
        {copied ? "Copied" : "Copy statement"}
      </button>
      {!canPrintHere ? (
        <a
          href={invoiceHref}
          className="inline-flex items-center rounded-lg border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold text-ink"
        >
          Open invoice
        </a>
      ) : null}
      {canPrintHere ? (
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center rounded-lg border border-pine/20 bg-pine/5 px-3.5 py-2 text-sm font-semibold text-pine"
        >
          Print / PDF
        </button>
      ) : (
        <a
          href={invoiceHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg border border-pine/20 bg-pine/5 px-3.5 py-2 text-sm font-semibold text-pine"
        >
          Print / PDF
        </a>
      )}
    </div>
  );
}
