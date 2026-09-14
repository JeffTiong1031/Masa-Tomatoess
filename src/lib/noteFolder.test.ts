import { describe, it, expect } from 'vitest';
import {
  folderAndDescendantIds,
  folderChoices,
  folderNameOrDefault,
  folderTrail,
  folderTree,
  nextFolderPosition,
  newFolder,
  type NoteFolder,
} from './noteFolder';

function folder(
  id: string,
  parentId: string | null,
  position: number,
  extra: Partial<NoteFolder> = {},
): NoteFolder {
  return {
    id,
    owner: 'Jeff',
    parentId,
    name: id,
    colour: '#4F7A2A',
    position,
    binGroup: null,
    deletedAt: null,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    ...extra,
  };
}

describe('folderNameOrDefault', () => {
  it('falls back when the name is only spaces', () => {
    expect(folderNameOrDefault('   ')).toBe('Folder');
  });

  it('trims what it keeps', () => {
    expect(folderNameOrDefault('  Recipes ')).toBe('Recipes');
  });
});

describe('folderTree', () => {
  it('nests children under parents and records depth', () => {
    const tree = folderTree([
      folder('recipes', null, 100),
      folder('baking', 'recipes', 100),
      folder('uni', null, 200),
    ]);

    expect(tree.map((node) => node.folder.id)).toEqual(['recipes', 'uni']);
    expect(tree[0].children.map((node) => node.folder.id)).toEqual(['baking']);
    expect(tree[0].depth).toBe(0);
    expect(tree[0].children[0].depth).toBe(1);
  });

  it('orders siblings by position, then by name', () => {
    const tree = folderTree([
      folder('b', null, 100),
      folder('a', null, 100),
      folder('first', null, 50),
    ]);

    expect(tree.map((node) => node.folder.id)).toEqual(['first', 'a', 'b']);
  });

  it('leaves binned folders out', () => {
    const tree = folderTree([
      folder('recipes', null, 100),
      folder('gone', null, 200, { deletedAt: '2026-09-14T00:00:00.000Z' }),
    ]);

    expect(tree.map((node) => node.folder.id)).toEqual(['recipes']);
  });

  it('lifts an orphan to the top instead of hiding it', () => {
    // A child whose parent is binned would otherwise be unreachable: not in
    // the rail, not in the bin, and impossible to move.
    const tree = folderTree([
      folder('parent', null, 100, { deletedAt: '2026-09-14T00:00:00.000Z' }),
      folder('child', 'parent', 100),
    ]);

    expect(tree.map((node) => node.folder.id)).toEqual(['child']);
    expect(tree[0].depth).toBe(0);
  });
});

describe('folderAndDescendantIds', () => {
  it('collects the whole subtree, itself included', () => {
    const folders = [
      folder('recipes', null, 100),
      folder('baking', 'recipes', 100),
      folder('cakes', 'baking', 100),
      folder('uni', null, 200),
    ];

    expect(folderAndDescendantIds(folders, 'recipes').sort()).toEqual([
      'baking',
      'cakes',
      'recipes',
    ]);
  });
});

describe('folderTrail', () => {
  it('reads from the top down', () => {
    const folders = [
      folder('recipes', null, 100),
      folder('baking', 'recipes', 100),
    ];

    expect(folderTrail(folders, 'baking').map((f) => f.id)).toEqual([
      'recipes',
      'baking',
    ]);
  });

  it('stops rather than looping if two folders parent each other', () => {
    const folders = [folder('a', 'b', 100), folder('b', 'a', 100)];

    expect(folderTrail(folders, 'a').map((f) => f.id)).toEqual(['b', 'a']);
  });
});

describe('folderChoices', () => {
  it('offers every folder with its depth', () => {
    const choices = folderChoices([
      folder('recipes', null, 100),
      folder('baking', 'recipes', 100),
    ]);

    expect(choices).toEqual([
      { id: 'recipes', name: 'recipes', colour: '#4F7A2A', depth: 0 },
      { id: 'baking', name: 'baking', colour: '#4F7A2A', depth: 1 },
    ]);
  });

  it('refuses to offer a folder its own descendants', () => {
    const choices = folderChoices(
      [
        folder('recipes', null, 100),
        folder('baking', 'recipes', 100),
        folder('uni', null, 200),
      ],
      'recipes',
    );

    expect(choices.map((choice) => choice.id)).toEqual(['uni']);
  });
});

describe('nextFolderPosition', () => {
  it('starts at 100 and steps past the last sibling', () => {
    expect(nextFolderPosition([], null)).toBe(100);
    expect(
      nextFolderPosition([folder('a', null, 100), folder('b', null, 300)], null),
    ).toBe(400);
  });

  it('counts only siblings of the same parent', () => {
    expect(
      nextFolderPosition(
        [folder('a', null, 900), folder('b', 'a', 100)],
        'a',
      ),
    ).toBe(200);
  });
});

describe('newFolder', () => {
  it('starts live, with both timestamps equal', () => {
    const made = newFolder(
      'id',
      'Jeff',
      ' Recipes ',
      '#B83A3A',
      null,
      100,
      '2026-09-15T01:00:00.000Z',
    );

    expect(made.name).toBe('Recipes');
    expect(made.deletedAt).toBeNull();
    expect(made.binGroup).toBeNull();
    expect(made.createdAt).toBe(made.updatedAt);
  });
});
