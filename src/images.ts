import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { readBytes } from './files';
import type { PdfImage } from './pdfCore';

export type ImagePage = { id: string; uri: string; width: number; height: number };

export function asFileUri(uri: string) {
  return uri.startsWith('/') ? `file://${uri}` : uri;
}

export function dimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(asFileUri(uri), (width, height) => resolve({ width, height }), reject);
  });
}

export async function makePage(uri: string): Promise<ImagePage> {
  const normalizedUri = asFileUri(uri);
  const { width, height } = await dimensions(normalizedUri);
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, uri: normalizedUri, width, height };
}

export async function rotatePage(page: ImagePage): Promise<ImagePage> {
  const image = await ImageManipulator.manipulate(page.uri).rotate(90).renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
  return { ...page, uri: result.uri, width: result.width, height: result.height };
}

export async function cropPage(page: ImagePage, edges: { left: number; right: number; top: number; bottom: number }): Promise<ImagePage> {
  const originX = Math.round(page.width * edges.left / 100);
  const originY = Math.round(page.height * edges.top / 100);
  const width = page.width - originX - Math.round(page.width * edges.right / 100);
  const height = page.height - originY - Math.round(page.height * edges.bottom / 100);
  if (width < 20 || height < 20) throw new Error('The crop area is too small.');
  const image = await ImageManipulator.manipulate(page.uri).crop({ originX, originY, width, height }).renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
  return { ...page, uri: result.uri, width: result.width, height: result.height };
}

export async function normalizedImage(page: ImagePage): Promise<PdfImage> {
  const image = await ImageManipulator.manipulate(page.uri).renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  return { bytes: await readBytes(result.uri), width: result.width, height: result.height };
}

