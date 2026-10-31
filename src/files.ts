import { Directory, File, Paths } from 'expo-file-system';

export type LibraryItem = {
  name: string;
  uri: string;
  size: number;
  createdAt: number;
};

const library = new Directory(Paths.document, 'pdfs');

function ensureLibrary() {
  library.create({ idempotent: true, intermediates: true });
}

function cleanName(raw: string): string {
  const stem = raw.replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ').trim();
  return stem.slice(0, 80) || 'Document';
}

function uniqueFile(name: string, exceptUri?: string): File {
  ensureLibrary();
  const stem = cleanName(name);
  for (let index = 0; index < 10000; index++) {
    const candidate = new File(library, `${stem}${index ? ` (${index + 1})` : ''}.pdf`);
    if (!candidate.exists || candidate.uri === exceptUri) return candidate;
  }
  throw new Error('Could not choose a unique file name.');
}

export async function listLibrary(): Promise<LibraryItem[]> {
  ensureLibrary();
  return library.list()
    .filter((entry): entry is File => entry instanceof File && entry.name.toLowerCase().endsWith('.pdf'))
    .map((file) => ({ name: file.name, uri: file.uri, size: file.size ?? 0, createdAt: file.creationTime ?? 0 }))
    .sort((a, b) => b.createdAt - a.createdAt || a.name.localeCompare(b.name));
}

export async function savePdf(name: string, bytes: Uint8Array): Promise<LibraryItem> {
  if (bytes.length === 0) throw new Error('The PDF is empty.');
  if (Paths.availableDiskSpace < bytes.length * 2 + 1024 * 1024) {
    throw new Error('There is not enough free storage to save this PDF.');
  }
  const destination = uniqueFile(name);
  const temporary = new File(Paths.cache, `pdfchanger-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  let moved = false;
  try {
    temporary.create();
    await temporary.write(bytes);
    await temporary.move(destination);
    moved = true;
    return { name: destination.name, uri: destination.uri, size: destination.size ?? bytes.length, createdAt: destination.creationTime ?? Date.now() };
  } finally {
    if (!moved && temporary.exists) temporary.delete();
  }
}

export async function renamePdf(item: LibraryItem, name: string) {
  if (!name.trim()) throw new Error('Enter a name for this PDF.');
  const current = new File(item.uri);
  if (!current.exists) throw new Error('This PDF is no longer available.');
  const destination = uniqueFile(name, item.uri);
  if (destination.uri !== item.uri) await current.move(destination);
  return { name: destination.name, uri: destination.uri };
}

export function deletePdf(item: LibraryItem) {
  const file = new File(item.uri);
  if (!file.exists) throw new Error('This PDF is no longer available.');
  file.delete();
}

export async function readBytes(uri: string): Promise<Uint8Array> {
  const file = new File(uri);
  if (!file.exists) throw new Error('A selected file is no longer available.');
  return file.bytes();
}

export async function previewPdf(item: { name: string; uri: string }) {
  await new File(item.uri).preview({ title: item.name });
}

