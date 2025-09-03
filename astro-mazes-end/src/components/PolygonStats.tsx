import React, { useMemo } from "react";

type StatKeys = "power" | "cost" | "popularity" | "difficulty" | "salt";

export type CardStatsProps = {
  /** Stats values; default scale is 0–10 (configurable via `max`) */
  values: Record<StatKeys, number>;
  /** Size (px) of the square SVG. Default 96 */
  size?: number;
  /** Max value used for normalization (e.g., 10 or 100). Default 10 */
  max?: number;
  /** Tailwind / CSS class for outer wrapper */
  className?: string;

  /** Appearance */
  stroke?: string;     // outline color
  fill?: string;       // filled polygon color
  gridColor?: string;  // grid/axis color
  dotColor?: string;   // data vertex dots color
  labelColor?: string; // label text color
  showLabels?: boolean; // toggle labels on/off
  rings?: number;       // number of grid rings (default 4)
  padding?: number;     // inner padding from edges (default 8)
  /** Opacity for fill (0–1). Default 0.35 */
  fillOpacity?: number;
};

const LABELS: StatKeys[] = [
  "power",
  "cost",
  "popularity",
  "difficulty",
  "salt",
];

/** Convert polar to cartesian (SVG y axis goes down) */
function polar(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const a = (Math.PI / 180) * angleDeg;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Text anchor helper so labels look nice around the shape */
function anchorFor(angle: number): "start" | "middle" | "end" {
  const a = ((angle % 360) + 360) % 360; // normalize
  if (a > 330 || a < 30 || (a > 150 && a < 210)) return "middle"; // top/bottom
  if (a >= 30 && a <= 150) return "start"; // right half
  return "end"; // left half
}

const PolygonStats: React.FC<CardStatsProps> = ({
  values,
  size = 96,
  max = 10,
  className,
  stroke = "#FFFFFF",
  fill = "#FFFFFF",
  gridColor = "#FFFFFF",
  dotColor = "#FFFFFF",
  labelColor = "#FFFFFF",
  showLabels = true,
  rings = 4,
  padding = 8,
  fillOpacity = 0.35,
}) => {
  const { pointsOutline, pointsData, axes, dots, labels } = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const R = (size / 2) - padding;
    const step = 360 / LABELS.length;  // 72°
    const startAngle = -90;            // Power at top

    // Outline points (full radius)
    const outline = LABELS.map((_, i) => {
      const angle = startAngle + i * step;
      const { x, y } = polar(cx, cy, R, angle);
      return `${x},${y}`;
    }).join(" ");

    // Data points (scaled by value/max, clamped to [0, 1])
    const dataVals = LABELS.map((k) => Math.max(0, Math.min(1, values[k] / max)));
    const data = LABELS.map((_, i) => {
      const angle = startAngle + i * step;
      const { x, y } = polar(cx, cy, R * dataVals[i], angle);
      return { x, y };
    });
    const dataStr = data.map(({ x, y }) => `${x},${y}`).join(" ");

    // Axes (center to each vertex at full radius)
    const axisLines = LABELS.map((_, i) => {
      const angle = startAngle + i * step;
      const p = polar(cx, cy, R, angle);
      return { x1: cx, y1: cy, x2: p.x, y2: p.y };
    });

    // Dots at each data vertex
    const dotPts = data.map(({ x, y }) => ({ x, y }));

    // Label positions slightly beyond the outline
    const labelRadius = R + 10;
    const labelDefs = LABELS.map((k, i) => {
      const angle = startAngle + i * step;
      const { x, y } = polar(cx, cy, labelRadius, angle);
      return { key: k, x, y, angle };
    });

    return {
      pointsOutline: outline,
      pointsData: dataStr,
      axes: axisLines,
      dots: dotPts,
      labels: labelDefs,
    };
  }, [values, size, max, padding, rings]);

  // Grid ring polygons (from center to outline)
  const gridPolys = Array.from({ length: rings }, (_, r) => {
    const t = (r + 1) / rings; // fraction of radius
    return LABELS.map((_, i) => {
      const cx = size / 2;
      const cy = size / 2;
      const R = (size / 2) - padding;
      const step = 360 / LABELS.length;
      const startAngle = -90;
      const angle = startAngle + i * step;
      const p = polar(cx, cy, R * t, angle);
      return `${p.x},${p.y}`;
    }).join(" ");
  });

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label="Card stats radar chart"
      >
        {/* Rings */}
        {gridPolys.map((pts, i) => (
          <polygon
            key={`ring-${i}`}
            points={pts}
            fill="none"
            stroke={gridColor}
            strokeOpacity={0.35}
            strokeWidth={0.75}
          />
        ))}

        {/* Axes */}
        {axes.map((a, i) => (
          <line
            key={`axis-${i}`}
            x1={a.x1}
            y1={a.y1}
            x2={a.x2}
            y2={a.y2}
            stroke={gridColor}
            strokeOpacity={0.35}
            strokeWidth={0.75}
          />
        ))}

        {/* Outline */}
        <polygon
          points={pointsOutline}
          fill="none"
          stroke={stroke}
          strokeWidth={1.25}
        />

        {/* Data fill */}
        <polygon
          points={pointsData}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={fill}
          strokeOpacity={0.9}
          strokeWidth={1}
        />

        {/* Data dots */}
        {dots.map((d, i) => (
          <circle
            key={`dot-${i}`}
            cx={d.x}
            cy={d.y}
            r={2}
            fill={dotColor}
            stroke={stroke}
            strokeWidth={0.5}
          />
        ))}

        {/* Labels */}
        {showLabels &&
          labels.map((l) => (
            <text
              key={`label-${l.key}`}
              x={l.x}
              y={l.y}
              fontSize={10}
              fill={labelColor}
              textAnchor={anchorFor(l.angle)}
              dominantBaseline={
                Math.abs(((l.angle % 360) + 360) % 360 - 270) < 1
                  ? "auto" // top
                  : Math.abs(((l.angle % 360) + 360) % 360 - 90) < 1
                  ? "hanging" // bottom
                  : "middle"
              }
            >
              {l.key[0].toUpperCase() + l.key.slice(1)}
            </text>
          ))}
      </svg>
    </div>
  );
};

export default PolygonStats;
