export function formatNpr(amount: string | number): string {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(value)) return "Rs —";
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Large shop rate: NPR amount + / unit */
export function formatRate(
  amount: string | number,
  unit = "1 pack",
): { amount: string; unitLabel: string } {
  return {
    amount: formatNpr(amount),
    unitLabel: unit.trim() ? `/ ${unit.trim()}` : "",
  };
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
