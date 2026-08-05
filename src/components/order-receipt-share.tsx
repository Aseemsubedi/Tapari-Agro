"use client";

import { useState } from "react";
import { customerWhatsAppHref } from "@/lib/orders";
import { whatsappLink } from "@/lib/shop";

export function OrderReceiptShare({
  message,
  phone,
  /** When true, WhatsApp goes to the customer (admin). Otherwise to the shop. */
  toCustomer = false,
  canPrintHere = false,
}: {
  message: string;
  phone?: string;
  toCustomer?: boolean;
  canPrintHere?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyStatement() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const waHref = toCustomer
    ? phone
      ? customerWhatsAppHref(phone, message)
      : null
    : whatsappLink(message);

  return (
    <div className="flex flex-wrap gap-2">
      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-lg bg-pine px-3.5 py-2 text-sm font-semibold text-white"
        >
          {toCustomer ? "Send on WhatsApp" : "Share on WhatsApp"}
        </a>
      ) : null}
      <button
        type="button"
        onClick={copyStatement}
        className="inline-flex min-h-11 items-center rounded-lg border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold text-ink"
      >
        {copied ? "Copied" : "Copy statement"}
      </button>
      {canPrintHere ? (
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center rounded-lg border border-pine/20 bg-pine/5 px-3.5 py-2 text-sm font-semibold text-pine"
        >
          Print / PDF
        </button>
      ) : null}
    </div>
  );
}
