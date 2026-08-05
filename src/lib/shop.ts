/** Public shop contact — set in .env for your real numbers */
export const shopConfig = {
  name: "Tapari Agro",
  tagline: "Nepal organic kitchen staples",
  phoneDisplay: process.env.NEXT_PUBLIC_PHONE ?? "9857620569",
  phoneTel: (process.env.NEXT_PUBLIC_PHONE ?? "9857620569").replace(/\s+/g, ""),
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP ?? "9779857620569").replace(
    /\D/g,
    "",
  ),
  deliveryNote: "Delivery in 2 days · All over Nepal",
  /** Blinkit-style header promise */
  deliveryHeadline: "Delivery in 2 Days",
  deliveryArea: "All over Nepal",
  /** Facebook reel / video or YouTube URL */
  storyVideo:
    process.env.NEXT_PUBLIC_STORY_VIDEO ??
    "https://www.facebook.com/reel/804246636044498",
  /** Bank deposit details (Nepal Investment Mega Bank) */
  bankName:
    process.env.NEXT_PUBLIC_BANK_NAME ?? "Nepal Investment Mega Bank Ltd.",
  bankAccountName:
    process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? "Tapari Agro Private Limited",
  bankAccountNumber:
    process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? "0641050252355",
  /** Public URL or /path to Fonepay QR flyer */
  qrImage: process.env.NEXT_PUBLIC_QR_IMAGE ?? "/payments/fonepay-qr.png",
};

export function shopBankDetailsConfigured() {
  return Boolean(
    shopConfig.qrImage.trim() ||
      shopConfig.bankName.trim() ||
      shopConfig.bankAccountName.trim() ||
      shopConfig.bankAccountNumber.trim(),
  );
}

export type StoryEmbed =
  | { type: "facebook"; src: string }
  | { type: "youtube"; src: string };

export function storyEmbed(
  raw = shopConfig.storyVideo,
): StoryEmbed | null {
  const value = raw.trim();
  if (!value) return null;

  try {
    const url = new URL(value);

    if (
      url.hostname.includes("facebook.com") ||
      url.hostname.includes("fb.watch")
    ) {
      return {
        type: "facebook",
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(value)}&show_text=false&width=267&height=476&t=0`,
      };
    }

    let id: string | null = null;
    if (url.hostname.includes("youtu.be")) {
      id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (url.searchParams.get("v")) {
      id = url.searchParams.get("v");
    } else {
      const parts = url.pathname.split("/");
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0) id = parts[embedIdx + 1] ?? null;
    }
    if (id && /^[\w-]{11}$/.test(id)) {
      return {
        type: "youtube",
        src: `https://www.youtube.com/embed/${id}?rel=0`,
      };
    }
  } catch {
    if (/^[\w-]{11}$/.test(value)) {
      return {
        type: "youtube",
        src: `https://www.youtube.com/embed/${value}?rel=0`,
      };
    }
  }

  return null;
}

export function whatsappLink(message?: string) {
  const text = encodeURIComponent(
    message ??
      "Hello Tapari Agro — I'd like to order from your shop.",
  );
  return `https://wa.me/${shopConfig.whatsapp}?text=${text}`;
}

export function callLink() {
  return `tel:${shopConfig.phoneTel}`;
}
