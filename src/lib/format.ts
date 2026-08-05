export function formatNpr(amount: string | number): string {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(value)) return "Rs —";
  const digits = new Intl.NumberFormat("en-NP", {
    maximumFractionDigits: 0,
  }).format(value);
  return `Rs ${digits}`;
}

/** Shop rate parts for clear display: Rs + amount + / unit */
export function formatRate(
  amount: string | number,
  unit = "1 pack",
): { prefix: string; amount: string; unitLabel: string; full: string } {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(value)) {
    return { prefix: "Rs", amount: "—", unitLabel: "", full: "Rs —" };
  }
  const digits = new Intl.NumberFormat("en-NP", {
    maximumFractionDigits: 0,
  }).format(value);
  const unitLabel = unit.trim() ? `/ ${unit.trim()}` : "";
  return {
    prefix: "Rs",
    amount: digits,
    unitLabel,
    full: unitLabel ? `Rs ${digits} ${unitLabel}` : `Rs ${digits}`,
  };
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
