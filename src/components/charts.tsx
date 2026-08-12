'use client';

import { useState } from 'react';

// مكونات رسم بياني خفيفة (SVG) بدون أي مكتبات خارجية
// النمط: أعمدة رفيعة بنهايات مدورة، لون واحد (موف)، شبكة خفيفة، tooltip عند الوقوف

export type DailyPoint = { label: string; value: number };

const BAR_FILL = '#8B4FD1'; // violet-500
const BAR_FILL_ACTIVE = '#5C2C93'; // violet-700
const GRID = '#F0EBF7';

export function DailyBarChart({
  data,
  height = 160,
  valueSuffix = '',
  emptyText = 'مفيش بيانات في الفترة دي',
}: {
  data: DailyPoint[];
  height?: number;
  valueSuffix?: string;
  emptyText?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(...data.map((d) => d.value), 0);
  if (data.length === 0 || max === 0) {
    return (
      <div className="h-[160px] flex items-center justify-center text-sm text-brand-ink/40">
        {emptyText}
      </div>
    );
  }

  const W = 600;
  const H = height;
  const padTop = 18;
  const padBottom = 22;
  const plotH = H - padTop - padBottom;
  const gap = 2;
  const barW = Math.max(2, W / data.length - gap);
  const maxIdx = data.findIndex((d) => d.value === max);

  return (
    <div className="relative" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        {/* شبكة خفيفة: خطين بس */}
        {[0.5, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={padTop + plotH * (1 - f)}
            y2={padTop + plotH * (1 - f)}
            stroke={GRID}
            strokeWidth={1}
          />
        ))}
        {data.map((d, i) => {
          const h = max > 0 ? (d.value / max) * plotH : 0;
          const x = i * (W / data.length) + gap / 2;
          const y = padTop + plotH - h;
          const active = hover === i;
          return (
            <g key={i}>
              {/* منطقة hover أوسع من العمود نفسه */}
              <rect
                x={i * (W / data.length)}
                y={0}
                width={W / data.length}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {d.value > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(h, 2)}
                  rx={Math.min(4, barW / 2)}
                  fill={active ? BAR_FILL_ACTIVE : BAR_FILL}
                  pointerEvents="none"
                />
              )}
              {/* تسمية مباشرة على أعلى قيمة بس */}
              {i === maxIdx && !hover && (
                <text
                  x={x + barW / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="#2C1548"
                >
                  {d.value.toLocaleString('ar-EG')}
                </text>
              )}
            </g>
          );
        })}
        {/* تسميات المحور: أول ونص وآخر يوم بس */}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
          <text
            key={i}
            x={i * (W / data.length) + barW / 2}
            y={H - 6}
            textAnchor="middle"
            fontSize={10}
            fill="#9A8FB0"
          >
            {data[i].label}
          </text>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="absolute top-0 bg-brand-ink text-white text-xs font-bold rounded-lg px-2.5 py-1.5 pointer-events-none whitespace-nowrap"
          style={{
            left: `${((hover + 0.5) / data.length) * 100}%`,
            transform: 'translateX(-50%)',
          }}
          dir="rtl"
        >
          {data[hover].label}: {data[hover].value.toLocaleString('ar-EG')}
          {valueSuffix}
        </div>
      )}
    </div>
  );
}

export function HBarList({
  items,
  valueSuffix = '',
  emptyText = 'مفيش بيانات لسه',
}: {
  items: { label: string; value: number }[];
  valueSuffix?: string;
  emptyText?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 0);
  if (items.length === 0 || max === 0) {
    return <p className="text-sm text-brand-ink/40 py-4 text-center">{emptyText}</p>;
  }
  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-brand-ink truncate">{item.label}</span>
            <span className="text-brand-ink/60 font-semibold shrink-0 mr-2">
              {item.value.toLocaleString('ar-EG')}
              {valueSuffix}
            </span>
          </div>
          <div className="h-2 bg-violet-50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.value / max) * 100}%`, background: BAR_FILL }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
