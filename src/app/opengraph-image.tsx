import { ImageResponse } from "next/og";

export const alt =
  "Tapari Agro — Organic spices, grains & honey from Nepal hills";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #1a3a2a 0%, #0f2419 55%, #1e3d2c 100%)",
          padding: "64px 72px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#c4a35a",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}
        >
          टपरी एग्रो · Tapari Agro
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              color: "#f4f1ea",
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: 900,
            }}
          >
            Organic staples from Nepal hills
          </div>
          <div
            style={{
              color: "rgba(244,241,234,0.72)",
              fontSize: 28,
              lineHeight: 1.35,
              maxWidth: 780,
            }}
          >
            Spices · grains · honey · oils — direct from kishan to your kitchen
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "rgba(244,241,234,0.55)",
            fontSize: 22,
          }}
        >
          <span>Parbat · Myagdi · Mustang</span>
          <span style={{ color: "#c4a35a", fontWeight: 600 }}>
            Order · Call · WhatsApp
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
