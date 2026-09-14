import { describe, it, expect } from 'vitest';
import type { Note } from './note';
import type { NoteFolder } from './noteFolder';
import {
  binEntries,
  binFolder,
  binNotes,
  binnedNotes,
  daysLeft,
  deleteAsk,
  expiredBinIds,
  folderBinCost,
  restoreGroup,
} from './noteBin';

const NOW = '2026-09-15T12:00:00.000Z';

function note(id: string, extra: Partial<Note> = {}): Note {
  return {
    id,
    owner: 'Jeff',
    title: id,
    body: '',
    sortOrder: 100,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    folderId: null,
    saved: true,
    binGroup: null,
    deletedAt: null,
    ...extra,
  };
}

function folder(
  id: string,
  parentId: string | null,
  extra: Partial<NoteFolder> = {},
): NoteFolder {
  return {
    id,
    owner: 'Jeff',
    parentId,
    name: id,
    colour: '#4F7A2A',
    position: 100,
    binGroup: null,
    deletedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...extra,
  };
}

describe('binNotes', () => {
  it('stamps the group and the time on what it hits', () => {
    const patch = binNotes([note('a'), note('b')], ['a'], 'group-1', NOW);

    expect(patch).toHaveLength(1);
    expect(patch[0].id).toBe('a');
    expect(patch[0].binGroup).toBe('group-1');
    expect(patch[0].deletedAt).toBe(NOW);
    expect(patch[0].updatedAt).toBe(NOW);
  });

  it('leaves an already binned note alone so its countdown is not reset', () => {
    const patch = binNotes(
      [note('a', { deletedAt: '2026-09-10T00:00:00.000Z' })],
      ['a'],
      'group-2',
      NOW,
    );

    expect(patch).toEqual([]);
  });
});

describe('binFolder', () => {
  const folders = [
    folder('recipes', null),
    folder('baking', 'recipes'),
    folder('uni', null),
  ];
  const notes = [
    note('cake', { folderId: 'baking' }),
    note('rice', { folderId: 'recipes' }),
    note('essay', { folderId: 'uni' }),
    note('loose'),
  ];

  it('takes the whole subtree and everything in it', () => {
    const patch = binFolder(folders, notes, 'recipes', 'group-3', NOW);

    expect(patch.folders.map((f) => f.id).sort()).toEqual([
      'baking',
      'recipes',
    ]);
    expect(patch.notes.map((n) => n.id).sort()).toEqual(['cake', 'rice']);
  });

  it('gives every row in one action the same group', () => {
    const patch = binFolder(folders, notes, 'recipes', 'group-3', NOW);
    const groups = new Set([
      ...patch.folders.map((f) => f.binGroup),
      ...patch.notes.map((n) => n.binGroup),
    ]);

    expect([...groups]).toEqual(['group-3']);
  });

  it('does not touch a sibling folder or an unfiled note', () => {
    const patch = binFolder(folders, notes, 'recipes', 'group-3', NOW);

    expect(patch.folders.map((f) => f.id)).not.toContain('uni');
    expect(patch.notes.map((n) => n.id)).not.toContain('loose');
  });
});

describe('folderBinCost', () => {
  it('counts what would go with the folder, itself not counted', () => {
    const cost = folderBinCost(
      [folder('recipes', null), folder('baking', 'recipes')],
      [
        note('cake', { folderId: 'baking' }),
        note('rice', { folderId: 'recipes' }),
        note('gone', {
          folderId: 'recipes',
          deletedAt: '2026-09-10T00:00:00.000Z',
        }),
      ],
      'recipes',
    );

    expect(cost).toEqual({ folders: 1, files: 2 });
  });
});

describe('restoreGroup', () => {
  it('brings a folder and the notes binned with it back together', () => {
    const folders = [
      folder('recipes', null, { binGroup: 'g', deletedAt: NOW }),
      folder('baking', 'recipes', { binGroup: 'g', deletedAt: NOW }),
    ];
    const notes = [note('cake', { folderId: 'baking', binGroup: 'g', deletedAt: NOW })];

    const patch = restoreGroup(notes, folders, 'g', NOW);

    expect(patch.folders.map((f) => f.deletedAt)).toEqual([null, null]);
    expect(patch.notes[0].deletedAt).toBeNull();
    expect(patch.notes[0].binGroup).toBeNull();
    expect(patch.notes[0].folderId).toBe('baking');
  });

  it('puts a note back where it was when its folder never left', () => {
    const patch = restoreGroup(
      [note('rice', { folderId: 'recipes', binGroup: 'g', deletedAt: NOW })],
      [folder('recipes', null)],
      'g',
      NOW,
    );

    expect(patch.notes[0].folderId).toBe('recipes');
  });

  it('drops a note outside any folder when its folder was swept for good', () => {
    // The folder row is gone from the table entirely, so pointing at it
    // would leave the note invisible in every list.
    const patch = restoreGroup(
      [note('rice', { folderId: 'recipes', binGroup: 'g', deletedAt: NOW })],
      [],
      'g',
      NOW,
    );

    expect(patch.notes[0].folderId).toBeNull();
  });

  it('ignores rows from a different bin action', () => {
    const patch = restoreGroup(
      [
        note('mine', { binGroup: 'g', deletedAt: NOW }),
        note('theirs', { binGroup: 'other', deletedAt: NOW }),
      ],
      [],
      'g',
      NOW,
    );

    expect(patch.notes.map((n) => n.id)).toEqual(['mine']);
  });
});

describe('binEntries', () => {
  it('shows a folder and what went with it as one row', () => {
    const entries = binEntries(
      [
        note('cake', { folderId: 'baking', binGroup: 'g', deletedAt: NOW }),
        note('rice', { folderId: 'recipes', binGroup: 'g', deletedAt: NOW }),
      ],
      [
        folder('recipes', null, { binGroup: 'g', deletedAt: NOW }),
        folder('baking', 'recipes', { binGroup: 'g', deletedAt: NOW }),
      ],
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: 'folder',
      title: 'recipes',
      inside: 3,
    });
  });

  it('names the top folder of the group, not a child', () => {
    const entries = binEntries(
      [],
      [
        folder('baking', 'recipes', { binGroup: 'g', deletedAt: NOW }),
        folder('recipes', null, { binGroup: 'g', deletedAt: NOW }),
      ],
    );

    expect(entries[0].title).toBe('recipes');
  });

  it('gives a note binned on its own its own row', () => {
    const entries = binEntries(
      [note('rice', { binGroup: 'g1', deletedAt: NOW })],
      [],
    );

    expect(entries).toEqual([
      {
        kind: 'note',
        id: 'rice',
        group: 'g1',
        title: 'rice',
        colour: null,
        deletedAt: NOW,
        inside: 0,
      },
    ]);
  });

  it('lists the most recent first', () => {
    const entries = binEntries(
      [
        note('older', { binGroup: 'g1', deletedAt: '2026-09-01T00:00:00.000Z' }),
        note('newer', { binGroup: 'g2', deletedAt: '2026-09-10T00:00:00.000Z' }),
      ],
      [],
    );

    expect(entries.map((entry) => entry.id)).toEqual(['newer', 'older']);
  });

  it('leaves live rows out', () => {
    expect(binEntries([note('here')], [folder('also', null)])).toEqual([]);
  });
});

describe('daysLeft', () => {
  const nowMs = Date.parse('2026-09-15T00:00:00.000Z');

  it('is 30 the moment something is binned', () => {
    expect(daysLeft('2026-09-15T00:00:00.000Z', nowMs)).toBe(30);
  });

  it('counts down whole days', () => {
    expect(daysLeft('2026-09-01T00:00:00.000Z', nowMs)).toBe(16);
  });

  it('never goes below zero', () => {
    expect(daysLeft('2026-01-01T00:00:00.000Z', nowMs)).toBe(0);
  });
});

describe('expiredBinIds', () => {
  const nowMs = Date.parse('2026-09-15T00:00:00.000Z');

  it('sweeps only what has sat for the full 30 days', () => {
    const { noteIds, folderIds } = expiredBinIds(
      [
        note('old', { deletedAt: '2026-08-01T00:00:00.000Z' }),
        note('fresh', { deletedAt: '2026-09-14T00:00:00.000Z' }),
        note('live'),
      ],
      [folder('oldFolder', null, { deletedAt: '2026-08-01T00:00:00.000Z' })],
      nowMs,
    );

    expect(noteIds).toEqual(['old']);
    expect(folderIds).toEqual(['oldFolder']);
  });

  it('sweeps on the boundary day, not the day after', () => {
    const { noteIds } = expiredBinIds(
      [note('exactly', { deletedAt: '2026-08-16T00:00:00.000Z' })],
      [],
      nowMs,
    );

    expect(noteIds).toEqual(['exactly']);
  });
});

describe('binnedNotes', () => {
  it('lists the most recently binned first', () => {
    const rows = binnedNotes([
      note('older', { deletedAt: '2026-09-01T00:00:00.000Z' }),
      note('newer', { deletedAt: '2026-09-10T00:00:00.000Z' }),
      note('live'),
    ]);

    expect(rows.map((n) => n.id)).toEqual(['newer', 'older']);
  });
});

describe('deleteAsk', () => {
  it('names a single file and offers the bin', () => {
    const ask = deleteAsk([note('a', { title: 'Chicken rice' })], []);

    expect(ask.title).toBe('Move "Chicken rice" to bin?');
    expect(ask.confirmLabel).toBe('Yes, bin it');
  });

  it('warns that a draft cannot come back', () => {
    const ask = deleteAsk([], [note('a', { title: 'Untitled', saved: false })]);

    expect(ask.title).toBe('Delete "Untitled"?');
    expect(ask.body).toContain('gone for good');
  });

  it('says both halves when files and drafts are picked together', () => {
    const ask = deleteAsk(
      [note('a'), note('b')],
      [note('c', { saved: false })],
    );

    expect(ask.body).toContain('2 files');
    expect(ask.body).toContain('1 note');
    expect(ask.body).toContain('gone for good');
  });

  it('counts in the singular when there is one of a thing', () => {
    const ask = deleteAsk([note('a'), note('b')], []);

    expect(ask.body).toContain('2 files');
    expect(deleteAsk([], [note('c', { saved: false })]).body).toContain(
      'It was never saved',
    );
  });
});
