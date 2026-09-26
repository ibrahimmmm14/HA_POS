'use client';

import React from 'react';
import { useLanguage } from '@/components/common/LanguageContext';

interface AudiogramChartProps {
  frequencies?: number[];
  leftAir?: Record<number, number | null>;
  rightAir?: Record<number, number | null>;
  leftBone?: Record<number, number | null>;
  rightBone?: Record<number, number | null>;
  showSpeechBanana?: boolean;
}

export function AudiogramChart({
  frequencies = [125, 250, 500, 1000, 2000, 4000, 8000],
  leftAir = {},
  rightAir = {},
  leftBone = {},
  rightBone = {},
  showSpeechBanana = true,
}: AudiogramChartProps) {
  const { lang } = useLanguage();

  const width = 580;
  const height = 400;
  const padding = { top: 35, right: 40, bottom: 45, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const minDb = -10;
  const maxDb = 120;
  const dbSteps = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

  const getX = (freq: number) => {
    const idx = frequencies.indexOf(freq);
    if (idx === -1) return padding.left;
    return padding.left + (idx / (frequencies.length - 1)) * plotWidth;
  };

  const getY = (db: number) => {
    // Inverted scale: top is -10dB, bottom is 120dB
    return padding.top + ((db - minDb) / (maxDb - minDb)) * plotHeight;
  };

  // Build points for Air Conduction lines
  const rightAirPoints = frequencies
    .filter((f) => rightAir[f] !== null && rightAir[f] !== undefined)
    .map((f) => `${getX(f)},${getY(rightAir[f]!)}`)
    .join(' ');

  const leftAirPoints = frequencies
    .filter((f) => leftAir[f] !== null && leftAir[f] !== undefined)
    .map((f) => `${getX(f)},${getY(leftAir[f]!)}`)
    .join(' ');

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
      {/* Legend & Ear Summary */}
      <div className="w-full flex items-center justify-between text-xs mb-3 font-semibold pb-2 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-red-600">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-red-500 font-bold text-xs">
              O
            </span>
            <span>{lang === 'ar' ? 'الأذن اليمنى (Right Air)' : 'Right Ear (Air)'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-700">
            <span className="font-mono font-bold text-sm">[</span>
            <span>{lang === 'ar' ? 'عظمي يمين (Right Bone)' : 'Right (Bone)'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-blue-600">
            <span className="inline-flex items-center justify-center w-5 h-5 font-bold text-xs">
              ✕
            </span>
            <span>{lang === 'ar' ? 'الأذن اليسرى (Left Air)' : 'Left Ear (Air)'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-700">
            <span className="font-mono font-bold text-sm">]</span>
            <span>{lang === 'ar' ? 'عظمي يسار (Left Bone)' : 'Left (Bone)'}</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto flex justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[580px] h-auto select-none bg-slate-50/50 rounded-lg border border-slate-200"
        >
          {/* Severity Bands */}
          {/* Normal: -10 to 20 */}
          <rect
            x={padding.left}
            y={getY(-10)}
            width={plotWidth}
            height={getY(20) - getY(-10)}
            fill="#f0fdf4"
            opacity={0.6}
          />
          {/* Mild: 20 to 40 */}
          <rect
            x={padding.left}
            y={getY(20)}
            width={plotWidth}
            height={getY(40) - getY(20)}
            fill="#fefce8"
            opacity={0.6}
          />
          {/* Moderate: 40 to 70 */}
          <rect
            x={padding.left}
            y={getY(40)}
            width={plotWidth}
            height={getY(70) - getY(40)}
            fill="#fff7ed"
            opacity={0.6}
          />
          {/* Severe: 70 to 90 */}
          <rect
            x={padding.left}
            y={getY(70)}
            width={plotWidth}
            height={getY(90) - getY(70)}
            fill="#fef2f2"
            opacity={0.6}
          />
          {/* Profound: 90 to 120 */}
          <rect
            x={padding.left}
            y={getY(90)}
            width={plotWidth}
            height={getY(120) - getY(90)}
            fill="#faf5ff"
            opacity={0.7}
          />

          {/* Severity Labels on Right Edge */}
          <text x={width - 5} y={getY(10)} textAnchor="end" fontSize="9" fill="#16a34a" fontWeight="bold">
            {lang === 'ar' ? 'طبيعي' : 'Normal'}
          </text>
          <text x={width - 5} y={getY(30)} textAnchor="end" fontSize="9" fill="#ca8a04">
            {lang === 'ar' ? 'بسيط' : 'Mild'}
          </text>
          <text x={width - 5} y={getY(55)} textAnchor="end" fontSize="9" fill="#ea580c">
            {lang === 'ar' ? 'متوسط' : 'Moderate'}
          </text>
          <text x={width - 5} y={getY(80)} textAnchor="end" fontSize="9" fill="#dc2626">
            {lang === 'ar' ? 'شديد' : 'Severe'}
          </text>
          <text x={width - 5} y={getY(105)} textAnchor="end" fontSize="9" fill="#9333ea">
            {lang === 'ar' ? 'عميق' : 'Profound'}
          </text>

          {/* Grid Lines - Horizontal (dB HL) */}
          {dbSteps.map((db) => (
            <g key={`db-${db}`}>
              <line
                x1={padding.left}
                y1={getY(db)}
                x2={width - padding.right}
                y2={getY(db)}
                stroke={db === 0 || db === 20 ? '#94a3b8' : '#e2e8f0'}
                strokeWidth={db === 0 || db === 20 ? 1.5 : 1}
                strokeDasharray={db === 0 ? '4 2' : undefined}
              />
              <text
                x={padding.left - 8}
                y={getY(db) + 3}
                textAnchor="end"
                fontSize="10"
                fill="#64748b"
                fontFamily="monospace"
              >
                {db}
              </text>
            </g>
          ))}

          {/* Grid Lines - Vertical (Frequency Hz) */}
          {frequencies.map((freq) => (
            <g key={`freq-${freq}`}>
              <line
                x1={getX(freq)}
                y1={padding.top}
                x2={getX(freq)}
                y2={height - padding.bottom}
                stroke="#cbd5e1"
                strokeWidth={freq === 1000 ? 1.5 : 1}
              />
              <text
                x={getX(freq)}
                y={padding.top - 12}
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill="#334155"
              >
                {freq >= 1000 ? `${freq / 1000}k` : freq}
              </text>
              <text
                x={getX(freq)}
                y={height - padding.bottom + 18}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
              >
                {freq}
              </text>
            </g>
          ))}

          {/* Speech Banana Silhouette (Optional) */}
          {showSpeechBanana && (
            <path
              d={`M ${getX(250)} ${getY(35)} Q ${getX(1000)} ${getY(25)} ${getX(4000)} ${getY(30)} Q ${getX(4000)} ${getY(55)} ${getX(1000)} ${getY(60)} Q ${getX(250)} ${getY(50)} Z`}
              fill="#fbbf24"
              opacity="0.18"
              stroke="#f59e0b"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* Air Conduction Lines */}
          {rightAirPoints && (
            <polyline
              points={rightAirPoints}
              fill="none"
              stroke="#dc2626"
              strokeWidth="2.5"
            />
          )}
          {leftAirPoints && (
            <polyline
              points={leftAirPoints}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
            />
          )}

          {/* Right Ear Symbols (O - Red) */}
          {frequencies.map((f) => {
            const db = rightAir[f];
            if (db === null || db === undefined) return null;
            return (
              <circle
                key={`r-air-${f}`}
                cx={getX(f)}
                cy={getY(db)}
                r="5.5"
                fill="white"
                stroke="#dc2626"
                strokeWidth="2.5"
              />
            );
          })}

          {/* Left Ear Symbols (X - Blue) */}
          {frequencies.map((f) => {
            const db = leftAir[f];
            if (db === null || db === undefined) return null;
            const x = getX(f);
            const y = getY(db);
            const size = 5;
            return (
              <g key={`l-air-${f}`}>
                <line
                  x1={x - size}
                  y1={y - size}
                  x2={x + size}
                  y2={y + size}
                  stroke="#2563eb"
                  strokeWidth="2.5"
                />
                <line
                  x1={x - size}
                  y1={y + size}
                  x2={x + size}
                  y2={y - size}
                  stroke="#2563eb"
                  strokeWidth="2.5"
                />
              </g>
            );
          })}

          {/* Right Bone Symbols ([ - Red) */}
          {frequencies.map((f) => {
            const db = rightBone[f];
            if (db === null || db === undefined) return null;
            const x = getX(f) - 9;
            const y = getY(db);
            return (
              <text
                key={`r-bone-${f}`}
                x={x}
                y={y + 4}
                textAnchor="middle"
                fontSize="13"
                fontWeight="bold"
                fill="#b91c1c"
              >
                [
              </text>
            );
          })}

          {/* Left Bone Symbols (] - Blue) */}
          {frequencies.map((f) => {
            const db = leftBone[f];
            if (db === null || db === undefined) return null;
            const x = getX(f) + 9;
            const y = getY(db);
            return (
              <text
                key={`l-bone-${f}`}
                x={x}
                y={y + 4}
                textAnchor="middle"
                fontSize="13"
                fontWeight="bold"
                fill="#1d4ed8"
              >
                ]
              </text>
            );
          })}
        </svg>
      </div>

      <div className="w-full flex items-center justify-between text-[11px] text-gray-500 mt-2 px-2">
        <span>{lang === 'ar' ? 'مستوى السمع (dB HL)' : 'Hearing Level (dB HL)'}</span>
        <span>{lang === 'ar' ? 'التردد بالهرتز (Hz)' : 'Frequency (Hz)'}</span>
      </div>
    </div>
  );
}
