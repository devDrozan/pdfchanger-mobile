import { File, Paths } from 'expo-file-system';
import type { LibraryItem } from './files';

const recentFile = new File(Paths.document, 'merge-recent.json');

function fileName(entry: string): string {
  if (!entry.includes('/')) return entry;
  const lastPart = entry.split('/').pop() ?? '';
  try { return decodeURIComponent(lastPart); }
  catch { return lastPart; }
}

async function readRecentNames(): Promise<string[]> {
  if (!recentFile.exists) return [];
  try {
    const parsed: unknown = JSON.parse(await recentFile.text());
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((entry): entry is string => typeof entry === 'string').map(fileName))]
      : [];
  } catch {
    return [];
  }
}

async function writeRecentNames(names: string[]): Promise<void> {
  const temporary = new File(Paths.document, `merge-recent-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  try {
    temporary.create();
    await temporary.write(JSON.stringify([...new Set(names)]));
    await temporary.move(recentFile, { overwrite: true });
  } finally {
    if (temporary.exists) temporary.delete();
  }
}

export async function listRecentMerge(library: LibraryItem[]): Promise<LibraryItem[]> {
  const byName = new Map(library.map((item) => [item.name, item]));
  return (await readRecentNames()).flatMap((name) => {
    const item = byName.get(name);
    return item ? [item] : [];
  });
}

export async function addRecentMerge(name: string): Promise<void> {
  await writeRecentNames([name, ...(await readRecentNames()).filter((recent) => recent !== name)]);
}

export async function replaceRecentMergeName(oldName: string, newName: string): Promise<void> {
  const names = await readRecentNames();
  if (names.includes(oldName)) await writeRecentNames(names.map((name) => name === oldName ? newName : name));
}

export async function removeRecentMerge(name: string): Promise<void> {
  const names = await readRecentNames();
  if (names.includes(name)) await writeRecentNames(names.filter((recent) => recent !== name));
}
