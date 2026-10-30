import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { A4, PAGE_MARGIN, imagePlacement, imagesToPdf, mergePdfs, pdfPageCount } from '../src/pdfCore.ts';

async function sourcePdf(widths) {
  const pdf = await PDFDocument.create();
  widths.forEach((width) => pdf.addPage([width, 100]));
  return pdf.save();
}

test('image placement preserves proportions inside A4 margins', () => {
  const landscape = imagePlacement(4000, 2000);
  assert.equal(landscape.width / landscape.height, 2);
  assert.ok(landscape.x >= PAGE_MARGIN - 0.01);
  assert.ok(landscape.y >= PAGE_MARGIN - 0.01);
  assert.ok(landscape.x + landscape.width <= A4.width - PAGE_MARGIN + 0.01);
  assert.ok(landscape.y + landscape.height <= A4.height - PAGE_MARGIN + 0.01);
});

test('image conversion creates A4 pages in input order', async () => {
  const jpg = new Uint8Array(await readFile(new URL('./fixtures/page.jpg', import.meta.url)));
  const result = await PDFDocument.load(await imagesToPdf([
    { bytes: jpg, width: 2, height: 1 },
    { bytes: jpg, width: 1, height: 2 },
  ]));
  assert.equal(result.getPageCount(), 2);
  for (const page of result.getPages()) {
    assert.ok(Math.abs(page.getWidth() - A4.width) < 0.01);
    assert.ok(Math.abs(page.getHeight() - A4.height) < 0.01);
  }
});

test('merge keeps source order and page order', async () => {
  const first = await sourcePdf([101, 102]);
  const second = await sourcePdf([201, 202, 203]);
  const result = await PDFDocument.load(await mergePdfs([second, first]));
  assert.deepEqual(result.getPages().map((page) => page.getWidth()), [201, 202, 203, 101, 102]);
  assert.equal(await pdfPageCount(first), 2);
});

test('merge rejects an unreadable PDF without producing output', async () => {
  await assert.rejects(mergePdfs([await sourcePdf([100]), new Uint8Array([1, 2, 3])]));
});
