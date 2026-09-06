import { describe, it, expect } from 'vitest';
import { CALENDAR_CATEGORY_COLUMNS } from './calendarRepo';
import { TIMETABLE_RULE_COLUMNS } from './timetableRepo';
import { categoriesFromSwatchRows } from './categories';
import { rulesFromSwatchRows } from './timetableRule';

describe('post-migration colour selects', () => {
  it.each([
    ['calendar categories', CALENDAR_CATEGORY_COLUMNS],
    ['timetable rules', TIMETABLE_RULE_COLUMNS],
  ] as const)('does not ask for dropped legacy swatch on %s', (_label, columns) => {
    const parts = columns.split(',').map((part) => part.trim());
    expect(parts).toContain('swatch_id');
    expect(parts).not.toContain('swatch');
  });
});

describe('categoriesFromSwatchRows', () => {
  it('keeps rows that already have a swatch_id', () => {
    expect(
      categoriesFromSwatchRows([
        { id: 'a', name: 'Class', swatch_id: 's1', position: 0 },
        { id: 'b', name: 'Orphan', swatch_id: null, position: 1 },
      ]),
    ).toEqual([{ id: 'a', name: 'Class', swatchId: 's1', position: 0 }]);
  });
});

describe('rulesFromSwatchRows', () => {
  it('keeps rows that already have a swatch_id', () => {
    expect(
      rulesFromSwatchRows([
        {
          id: 'r1',
          owner: 'Jeff',
          weekday: 1,
          title: 'Ballet',
          start_time: '20:15:00',
          end_time: '21:15:00',
          swatch_id: 's1',
          text_override: null,
        },
        {
          id: 'r2',
          owner: 'Jeff',
          weekday: 2,
          title: 'Orphan',
          start_time: '10:00:00',
          end_time: '11:00:00',
          swatch_id: null,
          text_override: null,
        },
      ]),
    ).toEqual([
      {
        id: 'r1',
        owner: 'Jeff',
        weekday: 1,
        title: 'Ballet',
        startTime: '20:15',
        endTime: '21:15',
        swatchId: 's1',
        textOverride: null,
      },
    ]);
  });
});
