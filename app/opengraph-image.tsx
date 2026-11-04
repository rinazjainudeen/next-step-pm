import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/navigation";

export const alt = `${SITE_NAME}: a learning plan for product managers`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The picture shown when the site is shared on LinkedIn, Slack and so on.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(90deg, #07142b 0%, #0b1d3d 60%, #0a5f8a 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 40 }}>
          <div style={{ width: 28, height: 40, borderRadius: 6, background: "#3fc1ea", opacity: 0.5 }} />
          <div style={{ width: 28, height: 70, borderRadius: 6, background: "#3fc1ea", opacity: 0.78 }} />
          <div style={{ width: 28, height: 110, borderRadius: 6, background: "#3fc1ea" }} />
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 38, marginTop: 20, maxWidth: 900, opacity: 0.9 }}>{SITE_TAGLINE}</div>
        <div style={{ fontSize: 28, marginTop: 48, color: "#3fc1ea" }}>Free. No sign-up.</div>
      </div>
    ),
    size,
  );
}
