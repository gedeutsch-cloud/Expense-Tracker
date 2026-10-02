export const AXIS = { stroke: "#475569", tick: { fill: "#94a3b8", fontSize: 11 }, tickLine: false } as const;
export const GRID = { stroke: "rgba(148,163,184,0.1)", vertical: false } as const;
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(11,17,32,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "#e2e8f0", fontWeight: 600 },
  itemStyle: { color: "#cbd5e1" },
} as const;
