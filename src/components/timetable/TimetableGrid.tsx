import { WEEKDAYS_SHORT, type Weekday } from '@/lib/dates';
import { swatchToken } from '@/lib/categories';
import { rowSpanOf } from '@/lib/timetableGrid';
import type { TimetableRule } from '@/lib/timetableRule';

const HEADER_ROWS = 1;

export default function TimetableGrid({
  days,
  hours,
  today,
  onPick,
}: {
  days: TimetableRule[][];
  hours: { from: number; to: number };
  today: Weekday;
  onPick: (rule: TimetableRule) => void;
}) {
  const rowCount = hours.to - hours.from;

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[45rem] gap-px"
        style={{
          gridTemplateColumns: '2.75rem repeat(7, minmax(6rem, 1fr))',
          gridTemplateRows: `auto repeat(${rowCount}, 2.75rem)`,
        }}
      >
        <div />
        {WEEKDAYS_SHORT.map((name, index) => (
          <div
            key={name}
            className={`pb-2 text-center text-xs font-semibold ${
              index === today
                ? 'text-[var(--mt-accent-ink)]'
                : 'text-[var(--mt-text)]'
            }`}
          >
            {name}
          </div>
        ))}

        {Array.from({ length: rowCount }, (_, index) => (
          <div
            key={`hour-${index}`}
            className="pr-2 text-right text-[10px] leading-[2.75rem] text-[var(--mt-text-subtle)]"
            style={{ gridColumn: 1, gridRow: index + 1 + HEADER_ROWS }}
          >
            {`${hours.from + index}`.padStart(2, '0')}
          </div>
        ))}

        {days.map((_, dayIndex) =>
          Array.from({ length: rowCount }, (_, index) => (
            <div
              key={`cell-${dayIndex}-${index}`}
              className={`rounded-sm ${
                dayIndex === today
                  ? 'bg-[color-mix(in_srgb,var(--mt-accent)_12%,var(--mt-surface))]'
                  : 'bg-[var(--mt-surface)]'
              }`}
              style={{ gridColumn: dayIndex + 2, gridRow: index + 1 + HEADER_ROWS }}
            />
          )),
        )}

        {days.map((dayRules, dayIndex) =>
          dayRules.map((rule) => {
            const span = rowSpanOf(rule, hours.from);
            return (
              <button
                key={rule.id}
                type="button"
                onClick={() => onPick(rule)}
                className="overflow-hidden rounded-md px-2 py-1 text-left text-[11px] font-semibold leading-tight text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus)]"
                style={{
                  gridColumn: dayIndex + 2,
                  gridRow: `${span.startRow + HEADER_ROWS} / ${span.endRow + HEADER_ROWS}`,
                  background: `var(${swatchToken(rule.swatch)})`,
                }}
              >
                {rule.title}
                <span className="block text-[10px] font-normal opacity-80">
                  {rule.startTime}–{rule.endTime}
                </span>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
