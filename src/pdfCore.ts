import { PDFDocument } from 'pdf-lib';

export const A4 = { width: 595.28, height: 841.89 };
export const PAGE_MARGIN = 36;

export type PdfImage = {
  bytes: Uint8Array;
  width: number;
  height: number;
};

export function imagePlacement(width: number, height: number) {
  if (!(width > 0 && height > 0)) throw new Error('Image dimensions are invalid.');
  const maxWidth = A4.width - PAGE_MARGIN * 2;
  const maxHeight = A4.height - PAGE_MARGIN * 2;
  const scale = Math.min(maxWidth / width, maxHeight / height);
  const drawnWidth = width * scale;
  const drawnHeight = height * scale;
  return {
    x: (A4.width - drawnWidth) / 2,
    y: (A4.height - drawnHeight) / 2,
    width: drawnWidth,
    height: drawnHeight,
  };
}

export async function imagesToPdf(images: PdfImage[]): Promise<Uint8Array> {
  if (images.length === 0) throw new Error('Add at least one page.');
  const output = await PDFDocument.create();
  for (const image of images) {
    const embedded = await output.embedJpg(image.bytes);
    const page = output.addPage([A4.width, A4.height]);
    page.drawImage(embedded, imagePlacement(image.width, image.height));
  }
  return output.save();
}

export async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  const pdf = await PDFDocument.load(bytes);
  const count = pdf.getPageCount();
  if (count === 0) throw new Error('This PDF has no pages.');
  return count;
}

export async function mergePdfs(inputs: Uint8Array[]): Promise<Uint8Array> {
  if (inputs.length < 2) throw new Error('Select at least two PDFs.');
  const output = await PDFDocument.create();
  for (const bytes of inputs) {
    const source = await PDFDocument.load(bytes);
    const count = source.getPageCount();
    if (count === 0) throw new Error('A selected PDF has no pages.');
    const pages = await output.copyPages(source, Array.from({ length: count }, (_, i) => i));
    for (const page of pages) output.addPage(page);
  }
  return output.save();
}

