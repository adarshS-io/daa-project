import { useMemo } from "react";
import type { NetworkState } from "@/lib/network";

export function NetworkGraph({
  state,
  highlightFrom,
  reachableSet,
}: {
  state: NetworkState;
  highlightFrom?: string | null;
  reachableSet?: Set<string>;
}) {
  const { nodes, edges } = useMemo(() => {
    const n = state.users.length;
    const R = 130;
    const cx = 175, cy = 175;
    const nodes = state.users.map((u, i) => {
      const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
      return { id: u.id, name: u.name, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), hue: u.avatarHue };
    });
    const map = new Map(nodes.map((n) => [n.id, n]));
    const edges = state.friendships
      .map((f) => {
        const [a, b] = f.split("|");
        const na = map.get(a), nb = map.get(b);
        if (!na || !nb) return null;
        const involvesHi = highlightFrom && (a === highlightFrom || b === highlightFrom);
        return { a, b, x1: na.x, y1: na.y, x2: nb.x, y2: nb.y, highlight: !!involvesHi };
      })
      .filter(Boolean) as Array<{ a: string; b: string; x1: number; y1: number; x2: number; y2: number; highlight: boolean }>;
    return { nodes, edges };
  }, [state, highlightFrom]);

  return (
    <svg viewBox="0 0 350 350" className="h-full w-full">
      {edges.map((e, i) => (
        <line
          key={i}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke={e.highlight ? "oklch(0.7 0.2 340)" : "oklch(0.6 0.05 270 / 0.5)"}
          strokeWidth={e.highlight ? 2.5 : 1.5}
          className={e.highlight ? "edge-animated" : ""}
        />
      ))}
      {nodes.map((n) => {
        const isHi = n.id === highlightFrom;
        const isReach = reachableSet?.has(n.id);
        return (
          <g key={n.id} className="animate-float-in">
            <circle
              cx={n.x}
              cy={n.y}
              r={isHi ? 20 : 16}
              fill={`hsl(${n.hue} 80% 55%)`}
              stroke={isReach ? "oklch(0.75 0.2 60)" : "white"}
              strokeWidth={isReach ? 3 : 2}
            />
            <text
              x={n.x}
              y={n.y + 32}
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="currentColor"
            >
              {n.name.length > 10 ? n.name.slice(0, 9) + "…" : n.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
