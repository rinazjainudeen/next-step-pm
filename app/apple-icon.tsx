import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The icon an iPhone or iPad shows when someone adds the site to their home screen.
// The same three steps as app/icon.svg, on a full navy square, because iOS rounds the corners itself.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 11, paddingBottom: 28, background: "#07142b" }}>
        <div style={{ width: 34, height: 45, borderRadius: 8, background: "#3fc1ea", opacity: 0.5 }} />
        <div style={{ width: 34, height: 79, borderRadius: 8, background: "#3fc1ea", opacity: 0.78 }} />
        <div style={{ width: 34, height: 124, borderRadius: 8, background: "#3fc1ea" }} />
      </div>
    ),
    size,
  );
}
