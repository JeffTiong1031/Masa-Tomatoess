import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Phase } from '@/lib/cycle';
import type { CalendarDay } from '@/lib/cycleCalendar';
import { PHASE_LABELS, PHASE_VAR, TINT, phaseFill } from '@/lib/cycleColors';
import {
  WEEKDAYS_SHORT,
  formatMonthYear,
  formatShortDate,
} from '@/lib/cycleDates';

const LEGEND_ORDER: Phase[] = ['menstrual', 'fertile', 'luteal', 'follicular'];

function isGuessedPeriod(day: CalendarDay): boolean {
  return day.phase === 'menstrual' && !day.recorded;
}

function runKey(day: CalendarDay): string {
  return `${day.phase ?? 'none'}|${day.recorded}|${isGuessedPeriod(day)}|${day.inMonth}`;
}

function fillFor(day: CalendarDay): string {
  if (day.phase === null) return 'transparent';
  if (!day.inMonth) return phaseFill(day.phase, TINT.outOfMonth);
  if (day.recorded) return phaseFill(day.phase, TINT.period);
  if (isGuessedPeriod(day)) return phaseFill(day.phase, TINT.predicted);
  return phaseFill(day.phase, TINT.phase);
}

function cornerRadius(joinLeft: boolean, joinRight: boolean): string {
  const left = joinLeft ? '0' : '14px';
  const right = joinRight ? '0' : '14px';
  return `${left} ${right} ${right} ${left}`;
}

function describe(day: CalendarDay): string {
  const parts = [formatShortDate(day.date)];
  if (day.recorded) parts.push('period recorded');
  else if (isGuessedPeriod(day)) parts.push('period predicted');
  else if (day.phase) parts.push(PHASE_LABELS[day.phase].toLowerCase());
  if (day.hasSymptoms) parts.push('has symptoms');
  if (day.isToday) parts.push('today');
  return parts.join(', ');
}

export default function CycleCalendar({
  month,
  days,
  selectedDate,
  onSelect,
  onMonth,
}: {
  month: string;
  days: CalendarDay[];
  selectedDate: string;
  onSelect: (date: string) => void;
  onMonth: (step: -1 | 1) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonth(-1)}
          aria-label="Previous month"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--mt-text-muted)] hover:bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <span className="text-sm font-semibold text-[var(--mt-text)]">
          {formatMonthYear(month)}
        </span>
        <button
          type="button"
          onClick={() => onMonth(1)}
          aria-label="Next month"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--mt-text-muted)] hover:bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)]"
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7">
        {WEEKDAYS_SHORT.map((label) => (
          <span
            key={label}
            className="text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--mt-text-subtle)]"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7" style={{ rowGap: '6px' }}>
        {days.map((day, index) => {
          const column = index % 7;
          const previous = column > 0 ? days[index - 1] : undefined;
          const next = column < 6 ? days[index + 1] : undefined;
          const joinLeft = previous ? runKey(previous) === runKey(day) : false;
          const joinRight = next ? runKey(next) === runKey(day) : false;
          const dashed = isGuessedPeriod(day) && day.inMonth;
          const dash = `1.5px dashed ${PHASE_VAR.menstrual}`;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(day.date)}
              aria-label={describe(day)}
              aria-pressed={day.date === selectedDate}
              className="relative flex min-h-11 flex-col items-center justify-center gap-1 text-sm text-[var(--mt-text)]"
              style={{
                background: fillFor(day),
                borderRadius: cornerRadius(joinLeft, joinRight),
                boxSizing: 'border-box',
                borderTop: dashed ? dash : undefined,
                borderBottom: dashed ? dash : undefined,
                borderLeft: dashed && !joinLeft ? dash : undefined,
                borderRight: dashed && !joinRight ? dash : undefined,
                outline:
                  day.date === selectedDate
                    ? '2px solid var(--mt-focus)'
                    : undefined,
                outlineOffset: '-2px',
              }}
            >
              {day.isToday ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mt-text)] text-xs font-semibold text-[var(--mt-surface)]">
                  {Number(day.date.slice(8))}
                </span>
              ) : (
                <span className={day.inMonth ? '' : 'opacity-70'}>
                  {Number(day.date.slice(8))}
                </span>
              )}
              <span className="flex h-1.5 items-center gap-0.5">
                {day.phase === 'fertile' && !day.recorded && !day.predicted && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: PHASE_VAR.fertile }}
                    aria-hidden
                  />
                )}
                {day.hasSymptoms && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[var(--mt-text-muted)]"
                    aria-hidden
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--mt-border)] pt-3">
        {LEGEND_ORDER.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-xs text-[var(--mt-text)]"
          >
            <span
              className="h-2.5 w-5 rounded-full"
              style={{
                background: phaseFill(
                  item,
                  item === 'menstrual' ? TINT.period : TINT.phase,
                ),
              }}
              aria-hidden
            />
            {PHASE_LABELS[item]}
          </li>
        ))}
        <li className="flex items-center gap-2 text-xs text-[var(--mt-text)]">
          <span
            className="h-2.5 w-5 rounded-full border border-dashed"
            style={{
              background: phaseFill('menstrual', TINT.predicted),
              borderColor: PHASE_VAR.menstrual,
            }}
            aria-hidden
          />
          Predicted
        </li>
      </ul>
    </div>
  );
}
