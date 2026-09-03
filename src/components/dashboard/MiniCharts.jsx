function points(data, w, h, pad = 4) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  return data.map((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y];
  });
}

export function BarSpark({ data, color = "#f59e0b" }) {
  const w = 140;
  const h = 38;
  const max = Math.max(...data) * 1.08;
  const gap = 3;
  const barW = (w - gap * (data.length + 1)) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none">
      {data.map((v, i) => {
        const bh = Math.max(3, (v / max) * (h - 4));
        return <rect key={i} x={gap + i * (barW + gap)} y={h - bh} width={barW} height={bh} rx="2" fill={color} />;
      })}
    </svg>
  );
}

export function Sparkline({ data, color = "#94a3b8", fill = "rgba(148,163,184,0.18)" }) {
  const w = 140;
  const h = 38;
  const pts = points(data, w, h, 3);
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `M${pts[0][0]},${h} ${pts.map((p) => `L${p[0]},${p[1]}`).join(" ")} L${pts.at(-1)[0]},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none">
      <path d={area} fill={fill} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function DonutChart({ segments, total, centerLabel = "TOTAL", centerValue }) {
  const r = 52;
  const cx = 80;
  const cy = 80;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 160 160" className="h-[168px] w-[168px]">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef2f6" strokeWidth="18" />
      {segments.map((seg) => {
        const dash = (seg.value / total) * c;
        const el = (
          <circle
            key={seg.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="18"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#0f2744" fontSize={String(centerValue ?? total).length > 4 ? "22" : "28"} fontWeight="800">
        {centerValue ?? total}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="800" letterSpacing="1.4">
        {centerLabel}
      </text>
    </svg>
  );
}

export function LineChart({ series, labels, height = 180, domain, target, targetLabel, showDots = false }) {
  const w = 420;
  const h = height;
  const pad = { l: 32, r: 10, t: 14, b: 24 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const all = series.flatMap((s) => s.data);
  const sharedMin = domain?.[0] ?? Math.min(...all);
  const sharedMax = domain?.[1] ?? Math.max(...all);
  const sharedSpan = sharedMax - sharedMin || 1;
  const useShared = Boolean(domain);

  const toXY = (data) => {
    const min = useShared ? sharedMin : Math.min(...data);
    const max = useShared ? sharedMax : Math.max(...data);
    const span = max - min || 1;
    return data.map((v, i) => {
      const x = pad.l + (i / Math.max(data.length - 1, 1)) * innerW;
      const y = pad.t + innerH - ((v - min) / span) * innerH;
      return [x, y];
    });
  };

  const targetY =
    target == null || !useShared ? null : pad.t + innerH - ((Number(target) - sharedMin) / sharedSpan) * innerH;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[180px] w-full">
      {[0, 0.5, 1].map((t) => {
        const y = pad.t + innerH * (1 - t);
        const val = sharedMin + sharedSpan * t;
        const label = sharedSpan < 8 ? val.toFixed(2) : String(Math.round(val));
        return (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#eef2f6" strokeWidth="1" />
            {useShared ? (
              <text x={pad.l - 4} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="8" fontWeight="700">
                {label}
              </text>
            ) : null}
          </g>
        );
      })}
      {targetY != null ? (
        <g>
          <line
            x1={pad.l}
            x2={w - pad.r}
            y1={targetY}
            y2={targetY}
            stroke="#22c55e"
            strokeWidth="1.4"
            strokeDasharray="5 4"
          />
          {targetLabel ? (
            <text x={w - pad.r} y={targetY - 4} textAnchor="end" fill="#16a34a" fontSize="8" fontWeight="700">
              {targetLabel}
            </text>
          ) : null}
        </g>
      ) : null}
      {series.map((s) => {
        const pts = toXY(s.data);
        return (
          <g key={s.label}>
            <polyline
              points={pts.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {showDots
              ? pts.map((p, i) => (
                  <circle key={i} cx={p[0]} cy={p[1]} r="3.2" fill="#fff" stroke={s.color} strokeWidth="2" />
                ))
              : null}
          </g>
        );
      })}
      {labels.map((lab, i) => {
        const x = pad.l + (i / Math.max(labels.length - 1, 1)) * innerW;
        return (
          <text key={lab} x={x} y={h - 6} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="700">
            {lab}
          </text>
        );
      })}
    </svg>
  );
}

export function StackedHBar({ rows, keys }) {
  const rowH = 22;
  const h = rows.length * rowH + 8;
  const w = 420;
  const pad = { l: 36, r: 12, t: 4 };
  const innerW = w - pad.l - pad.r;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: Math.max(200, rows.length * 22) }}>
      {rows.map((row, i) => {
        const y = pad.t + i * rowH;
        let x = pad.l;
        return (
          <g key={row.label}>
            <text x={pad.l - 6} y={y + 13} textAnchor="end" fill="#64748b" fontSize="9" fontWeight="700">
              {row.label}
            </text>
            {keys.map((k) => {
              const pct = Number(row[k.key]) || 0;
              const bw = (pct / 100) * innerW;
              const el = (
                <g key={k.key}>
                  <rect x={x} y={y + 4} width={Math.max(0, bw)} height={12} fill={k.color} rx="2" />
                  {pct >= 2.5 ? (
                    <text x={x + bw / 2} y={y + 13.5} textAnchor="middle" fill="#fff" fontSize="7.5" fontWeight="800">
                      {pct.toFixed(1)}%
                    </text>
                  ) : null}
                </g>
              );
              x += bw;
              return el;
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function BarChart({ data, labels, color = "#3b82f6" }) {
  const w = 420;
  const h = 180;
  const pad = { l: 28, r: 8, t: 12, b: 24 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(...data) * 1.12;
  const gap = 8;
  const barW = (innerW - gap * data.length) / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[180px] w-full">
      {[0, 0.5, 1].map((t) => {
        const y = pad.t + innerH * (1 - t);
        return <line key={t} x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#eef2f6" strokeWidth="1" />;
      })}
      {data.map((v, i) => {
        const bh = (v / max) * innerH;
        const x = pad.l + i * (barW + gap) + gap / 2;
        const y = pad.t + innerH - bh;
        return (
          <rect key={labels[i]} x={x} y={y} width={barW} height={bh} rx="4" fill={color} opacity="0.92" />
        );
      })}
      {labels.map((lab, i) => {
        const x = pad.l + i * (barW + gap) + gap / 2 + barW / 2;
        return (
          <text key={lab} x={x} y={h - 6} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="700">
            {lab}
          </text>
        );
      })}
    </svg>
  );
}

export function GroupedBarChart({ series, labels }) {
  const w = 420;
  const h = 180;
  const pad = { l: 28, r: 8, t: 12, b: 24 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(...series.flatMap((s) => s.data)) * 1.12;
  const groupGap = 10;
  const groupW = (innerW - groupGap * labels.length) / labels.length;
  const barGap = 3;
  const barW = (groupW - barGap * (series.length - 1)) / series.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[180px] w-full">
      {[0, 0.5, 1].map((t) => {
        const y = pad.t + innerH * (1 - t);
        return <line key={t} x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#eef2f6" strokeWidth="1" />;
      })}
      {labels.map((lab, i) => {
        const gx = pad.l + i * (groupW + groupGap) + groupGap / 2;
        return series.map((s, si) => {
          const v = s.data[i];
          const bh = (v / max) * innerH;
          const x = gx + si * (barW + barGap);
          const y = pad.t + innerH - bh;
          return <rect key={`${lab}-${s.label}`} x={x} y={y} width={barW} height={bh} rx="3" fill={s.color} />;
        });
      })}
      {labels.map((lab, i) => {
        const x = pad.l + i * (groupW + groupGap) + groupGap / 2 + groupW / 2;
        return (
          <text key={lab} x={x} y={h - 6} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="700">
            {lab}
          </text>
        );
      })}
    </svg>
  );
}
