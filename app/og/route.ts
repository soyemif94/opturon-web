import React from "react";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  const root = React.createElement(
    "div",
    {
      style: {
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background:
          "radial-gradient(circle at 18% 20%, rgba(176,80,0,0.35), transparent 45%), radial-gradient(circle at 85% 10%, rgba(128,48,0,0.28), transparent 40%), #0B0B0B",
        color: "#F5F5F5",
        padding: "72px"
      }
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: 24,
          color: "#C05000",
          letterSpacing: "0.08em"
        }
      },
      React.createElement("span", null, "OPTURON")
    ),
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "16px" } },
      React.createElement(
        "h1",
        { style: { margin: 0, fontSize: 82, lineHeight: 1, fontWeight: 700 } },
        "Opturon"
      ),
      React.createElement(
        "p",
        { style: { margin: 0, fontSize: 38, color: "#E7E7E7" } },
        "Automatización empresarial con IA"
      ),
      React.createElement(
        "p",
        { style: { margin: 0, fontSize: 26, color: "#BDBDBD" } },
        "WhatsApp • Procesos • Integraciones"
      )
    )
  );

  return new ImageResponse(root, {
    width: 1200,
    height: 630
  });
}
