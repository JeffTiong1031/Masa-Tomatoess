import {
  starterDrafts,
  isHexColor,
  type ColourSwatch,
  type PaletteKind,
} from './colourPalette';
import type { UserName } from './identity';
import { supabase } from './supabase';

const SWATCH_COLUMNS = 'id, owner, kind, fill, text_color, position';

interface SwatchRow {
  id: string;
  owner: UserName;
  kind: PaletteKind;
  fill: string;
  text_color: string | null;
  position: number;
}

function toSwatch(row: SwatchRow): ColourSwatch {
  return {
    id: row.id,
    owner: row.owner,
    kind: row.kind,
    fill: row.fill,
    textColor: row.text_color,
    position: row.position,
  };
}

async function selectPalette(
  owner: UserName,
  kind: PaletteKind,
): Promise<{ rows: SwatchRow[] | null; error: boolean }> {
  const { data, error } = await supabase
    .from('colour_swatches')
    .select(SWATCH_COLUMNS)
    .eq('owner', owner)
    .eq('kind', kind)
    .order('position', { ascending: true });

  if (error) {
    console.error('Failed to load colour palette:', error);
    return { rows: null, error: true };
  }

  return { rows: data as SwatchRow[], error: false };
}

export async function fetchPalette(
  owner: UserName,
  kind: PaletteKind,
): Promise<ColourSwatch[] | null> {
  const first = await selectPalette(owner, kind);
  if (first.error) return null;
  const existing = first.rows ?? [];
  if (existing.length > 0) return existing.map(toSwatch);

  const { error: seedError } = await supabase.from('colour_swatches').insert(
    starterDrafts(kind).map((draft) => ({
      owner,
      kind: draft.kind,
      fill: draft.fill,
      text_color: draft.textColor,
      position: draft.position,
    })),
  );

  if (seedError) {
    console.error('Failed to seed colour palette:', seedError);
    return null;
  }

  const second = await selectPalette(owner, kind);
  if (second.error || second.rows === null) return null;
  return second.rows.map(toSwatch);
}

export async function insertSwatch(
  owner: UserName,
  kind: PaletteKind,
  fill: string,
  textColor: string | null,
): Promise<ColourSwatch | null> {
  if (!isHexColor(fill)) return null;
  if (kind === 'timetable' && (textColor === null || !isHexColor(textColor))) {
    return null;
  }

  const { count, error: countError } = await supabase
    .from('colour_swatches')
    .select('id', { count: 'exact', head: true })
    .eq('owner', owner)
    .eq('kind', kind);

  if (countError) {
    console.error('Failed to size colour palette:', countError);
    return null;
  }

  const { data, error } = await supabase
    .from('colour_swatches')
    .insert({
      owner,
      kind,
      fill,
      text_color: textColor,
      position: count ?? 0,
    })
    .select(SWATCH_COLUMNS)
    .single();

  if (error) {
    console.error('Failed to add colour swatch:', error);
    return null;
  }

  return toSwatch(data as SwatchRow);
}

export async function updateSwatch(
  id: string,
  patch: { fill?: string; textColor?: string | null },
): Promise<boolean> {
  const columns: { fill?: string; text_color?: string | null } = {};
  if (patch.fill !== undefined) columns.fill = patch.fill;
  if (patch.textColor !== undefined) columns.text_color = patch.textColor;

  const { error } = await supabase
    .from('colour_swatches')
    .update(columns)
    .eq('id', id);

  if (error) {
    console.error('Failed to update colour swatch:', error);
    return false;
  }
  return true;
}

export async function deleteSwatch(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('colour_swatches')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete colour swatch:', error);
    return false;
  }
  return true;
}
