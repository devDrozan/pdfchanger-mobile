import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { deletePdf, listLibrary, previewPdf, readBytes, renamePdf, savePdf, type LibraryItem } from './src/files';
import { cropPage, makePage, normalizedImage, rotatePage, type ImagePage } from './src/images';
import { imagesToPdf, mergePdfs, pdfPageCount } from './src/pdfCore';

type Screen = 'library' | 'create' | 'merge';
type MergeInput = { id: string; name: string; uri: string; pages: number };
type CropEdges = { left: number; right: number; top: number; bottom: number };
const emptyEdges: CropEdges = { left: 0, right: 0, top: 0, bottom: 0 };

function errorText(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/encrypt|password/i.test(message)) return 'This PDF is password protected and cannot be merged.';
  if (/pdf|parse|header|catalog|invalid/i.test(message)) return 'A selected file could not be read as a PDF.';
  if (/space|storage|quota|ENOSPC/i.test(message)) return 'There is not enough free storage to finish this action.';
  return message || 'Something went wrong. Please try again.';
}

function Button({ title, onPress, kind = 'secondary', disabled = false }: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, kind === 'primary' && styles.primaryButton, kind === 'danger' && styles.dangerButton, disabled && styles.disabledButton]}
    >
      <Text style={[styles.buttonText, kind === 'primary' && styles.primaryButtonText, kind === 'danger' && styles.dangerButtonText]}>{title}</Text>
    </TouchableOpacity>
  );
}

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = [...items];
  const other = index + direction;
  if (other < 0 || other >= next.length) return next;
  [next[index], next[other]] = [next[other], next[index]];
  return next;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('library');
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [pages, setPages] = useState<ImagePage[]>([]);
  const [mergeInputs, setMergeInputs] = useState<MergeInput[]>([]);
  const [name, setName] = useState('Document');
  const [busy, setBusy] = useState('');
  const [cropId, setCropId] = useState<string | null>(null);
  const [edges, setEdges] = useState<CropEdges>(emptyEdges);
  const [renameItem, setRenameItem] = useState<LibraryItem | null>(null);
  const [renameText, setRenameText] = useState('');

  const refresh = useCallback(async () => setLibrary(await listLibrary()), []);
  useEffect(() => { refresh().catch((error) => Alert.alert('Library error', errorText(error))); }, [refresh]);

  async function work(label: string, task: () => Promise<void>) {
    if (busy) return;
    setBusy(label);
    try { await task(); }
    catch (error) { Alert.alert('Could not complete action', errorText(error)); }
    finally { setBusy(''); }
  }

  function updatePage(updated: ImagePage) {
    setPages((current) => current.map((page) => page.id === updated.id ? updated : page));
  }

  function scan() {
    work('Scanning…', async () => {
      try {
        const result = await DocumentScanner.scanDocument();
        if (result.status === 'cancel' || !result.scannedImages?.length) return;
        const added = await Promise.all(result.scannedImages.map(makePage));
        setPages((current) => [...current, ...added]);
      } catch {
        throw new Error('Automatic scanning is unavailable right now. Use Camera photo to capture pages offline.');
      }
    });
  }

  function importImages() {
    work('Importing images…', async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 1 });
      if (result.canceled) return;
      const added = await Promise.all(result.assets.map((asset) => makePage(asset.uri)));
      setPages((current) => [...current, ...added]);
    });
  }

  function cameraPhoto() {
    work('Opening camera…', async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error('Camera permission is needed to photograph a page.');
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled) return;
      const added = await Promise.all(result.assets.map((asset) => makePage(asset.uri)));
      setPages((current) => [...current, ...added]);
    });
  }

  function importImageFiles() {
    work('Importing images…', async () => {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const added = await Promise.all(result.assets.map((asset) => makePage(asset.uri)));
      setPages((current) => [...current, ...added]);
    });
  }

  function rotate(page: ImagePage) {
    work('Rotating page…', async () => updatePage(await rotatePage(page)));
  }

  function applyCrop() {
    const page = pages.find((item) => item.id === cropId);
    if (!page) return;
    work('Cropping page…', async () => {
      updatePage(await cropPage(page, edges));
      setCropId(null);
      setEdges(emptyEdges);
    });
  }

  function saveImages() {
    work('Creating PDF…', async () => {
      if (!pages.length) throw new Error('Add at least one page.');
      const normalized = [];
      for (const page of pages) normalized.push(await normalizedImage(page));
      await savePdf(name, await imagesToPdf(normalized));
      setPages([]);
      setName('Document');
      await refresh();
      setScreen('library');
    });
  }

  function importPdfs() {
    work('Importing PDFs…', async () => {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const added: MergeInput[] = [];
      for (const asset of result.assets) {
        const bytes = await readBytes(asset.uri);
        added.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: asset.name, uri: asset.uri, pages: await pdfPageCount(bytes) });
      }
      setMergeInputs((current) => [...current, ...added]);
    });
  }

  function saveMerge() {
    work('Merging PDFs…', async () => {
      if (mergeInputs.length < 2) throw new Error('Select at least two PDFs.');
      const inputs = [];
      for (const item of mergeInputs) inputs.push(await readBytes(item.uri));
      await savePdf(name, await mergePdfs(inputs));
      setMergeInputs([]);
      setName('Document');
      await refresh();
      setScreen('library');
    });
  }

  function share(item: LibraryItem) {
    work('Opening share sheet…', async () => {
      if (!await Sharing.isAvailableAsync()) throw new Error('Sharing is unavailable on this device.');
      await Sharing.shareAsync(item.uri, { mimeType: 'application/pdf' });
    });
  }

  async function openPdf(item: { name: string; uri: string }) {
    try { await previewPdf(item); }
    catch {
      if (!await Sharing.isAvailableAsync()) throw new Error('No PDF viewer or sharing app is available on this device.');
      await Sharing.shareAsync(item.uri, { mimeType: 'application/pdf' });
    }
  }

  function confirmDelete(item: LibraryItem) {
    Alert.alert('Delete PDF?', `Delete ${item.name} from this app?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => work('Deleting PDF…', async () => { deletePdf(item); await refresh(); }) },
    ]);
  }

  function submitRename() {
    if (!renameItem) return;
    work('Renaming PDF…', async () => {
      renamePdf(renameItem, renameText);
      setRenameItem(null);
      await refresh();
    });
  }

  const cropPageItem = pages.find((item) => item.id === cropId);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.brand}>PDF Changer</Text>
        <Text style={styles.subtitle}>Your documents stay on this device.</Text>
      </View>
      <View style={styles.tabs}>
        {([['library', 'Library'], ['create', 'New PDF'], ['merge', 'Merge PDFs']] as const).map(([key, label]) => (
          <TouchableOpacity key={key} accessibilityRole="tab" accessibilityState={{ selected: screen === key }} onPress={() => setScreen(key)} style={[styles.tab, screen === key && styles.activeTab]}>
            <Text style={[styles.tabText, screen === key && styles.activeTabText]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {screen === 'library' && <>
          <Text style={styles.heading}>Your PDFs</Text>
          {library.length === 0 ? <Text style={styles.empty}>No PDFs yet. Scan a document or import images to make your first one.</Text> : library.map((item) => (
            <View key={item.uri} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.meta}>{Math.max(1, Math.round(item.size / 1024))} KB</Text>
              <View style={styles.actions}>
                <Button title="Preview" onPress={() => work('Opening PDF…', async () => openPdf(item))} disabled={!!busy} />
                <Button title="Share" onPress={() => share(item)} disabled={!!busy} />
                <Button title="Rename" onPress={() => { setRenameItem(item); setRenameText(item.name.replace(/\.pdf$/i, '')); }} disabled={!!busy} />
                <Button title="Delete" kind="danger" onPress={() => confirmDelete(item)} disabled={!!busy} />
              </View>
            </View>
          ))}
        </>}
        {screen === 'create' && <>
          <Text style={styles.heading}>Create from pages</Text>
          <Text style={styles.body}>Scan documents or choose photos. Adjust and arrange the pages before saving.</Text>
          <View style={styles.actions}><Button title="Auto scan" kind="primary" onPress={scan} disabled={!!busy} /><Button title="Camera photo" onPress={cameraPhoto} disabled={!!busy} /><Button title="Photos" onPress={importImages} disabled={!!busy} /><Button title="Image files" onPress={importImageFiles} disabled={!!busy} /></View>
          {pages.map((page, index) => (
            <View key={page.id} style={styles.card}>
              <Text style={styles.cardTitle}>Page {index + 1}</Text>
              <Image source={{ uri: page.uri }} style={styles.thumbnail} resizeMode="contain" />
              <View style={styles.actions}>
                <Button title="Crop" onPress={() => { setCropId(page.id); setEdges(emptyEdges); }} disabled={!!busy} />
                <Button title="Rotate" onPress={() => rotate(page)} disabled={!!busy} />
                <Button title="↑" onPress={() => setPages((current) => move(current, index, -1))} disabled={!!busy || index === 0} />
                <Button title="↓" onPress={() => setPages((current) => move(current, index, 1))} disabled={!!busy || index === pages.length - 1} />
                <Button title="Remove" kind="danger" onPress={() => setPages((current) => current.filter((item) => item.id !== page.id))} disabled={!!busy} />
              </View>
            </View>
          ))}
          {pages.length > 0 && <View style={styles.saveBox}>
            <Text style={styles.label}>PDF name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={80} placeholder="Document" />
            <Text style={styles.meta}>Each page is fitted to A4 with margins.</Text>
            <Button title={`Save ${pages.length}-page PDF`} kind="primary" onPress={saveImages} disabled={!!busy} />
          </View>}
        </>}
        {screen === 'merge' && <>
          <Text style={styles.heading}>Combine PDFs</Text>
          <Text style={styles.body}>Select two or more PDFs. Move them into the order you want their pages to appear.</Text>
          <Button title="Choose PDFs" kind="primary" onPress={importPdfs} disabled={!!busy} />
          {mergeInputs.map((item, index) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{index + 1}. {item.name}</Text>
              <Text style={styles.meta}>{item.pages} {item.pages === 1 ? 'page' : 'pages'}</Text>
              <View style={styles.actions}>
                <Button title="Preview" onPress={() => work('Opening PDF…', async () => openPdf(item))} disabled={!!busy} />
                <Button title="↑" onPress={() => setMergeInputs((current) => move(current, index, -1))} disabled={!!busy || index === 0} />
                <Button title="↓" onPress={() => setMergeInputs((current) => move(current, index, 1))} disabled={!!busy || index === mergeInputs.length - 1} />
                <Button title="Remove" kind="danger" onPress={() => setMergeInputs((current) => current.filter((source) => source.id !== item.id))} disabled={!!busy} />
              </View>
            </View>
          ))}
          {mergeInputs.length >= 2 && <View style={styles.saveBox}>
            <Text style={styles.label}>Merged PDF name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={80} placeholder="Document" />
            <Button title={`Save merged PDF · ${mergeInputs.reduce((total, item) => total + item.pages, 0)} pages`} kind="primary" onPress={saveMerge} disabled={!!busy} />
          </View>}
        </>}
      </ScrollView>
      {!!busy && <View style={styles.busy}><Text style={styles.busyText}>{busy}</Text></View>}

      <Modal visible={!!cropPageItem} transparent animationType="slide" onRequestClose={() => setCropId(null)}>
        <View style={styles.modalShade}><View style={styles.modalSheet}>
          <Text style={styles.heading}>Crop page</Text>
          <Text style={styles.body}>Trim each edge in 5% steps. The outlined area will remain.</Text>
          {cropPageItem && <View style={[styles.cropPreview, { aspectRatio: cropPageItem.width / cropPageItem.height }]}>
            <Image source={{ uri: cropPageItem.uri }} style={styles.fill} resizeMode="stretch" />
            <View pointerEvents="none" style={[styles.cropOutline, { left: `${edges.left}%`, right: `${edges.right}%`, top: `${edges.top}%`, bottom: `${edges.bottom}%` }]} />
          </View>}
          {(['left', 'right', 'top', 'bottom'] as const).map((edge) => (
            <View key={edge} style={styles.cropRow}>
              <Text style={styles.cropLabel}>{edge[0].toUpperCase() + edge.slice(1)} · {edges[edge]}%</Text>
              <Button title="−" onPress={() => setEdges((current) => ({ ...current, [edge]: Math.max(0, current[edge] - 5) }))} disabled={edges[edge] === 0 || !!busy} />
              <Button title="+" onPress={() => setEdges((current) => {
                const opposite = edge === 'left' ? 'right' : edge === 'right' ? 'left' : edge === 'top' ? 'bottom' : 'top';
                return { ...current, [edge]: Math.min(90, 95 - current[opposite], current[edge] + 5) };
              })} disabled={edges[edge] >= 90 || (edge === 'left' || edge === 'right' ? edges.left + edges.right : edges.top + edges.bottom) >= 95 || !!busy} />
            </View>
          ))}
          <View style={styles.actions}><Button title="Cancel" onPress={() => setCropId(null)} disabled={!!busy} /><Button title="Apply crop" kind="primary" onPress={applyCrop} disabled={!!busy || Object.values(edges).every((value) => value === 0)} /></View>
        </View></View>
      </Modal>

      <Modal visible={!!renameItem} transparent animationType="fade" onRequestClose={() => setRenameItem(null)}>
        <View style={styles.modalShade}><View style={styles.modalSheet}>
          <Text style={styles.heading}>Rename PDF</Text>
          <TextInput autoFocus style={styles.input} value={renameText} onChangeText={setRenameText} maxLength={80} selectTextOnFocus />
          <View style={styles.actions}><Button title="Cancel" onPress={() => setRenameItem(null)} disabled={!!busy} /><Button title="Save name" kind="primary" onPress={submitRename} disabled={!!busy || !renameText.trim()} /></View>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const colors = { background: '#F5F7F5', ink: '#18332D', muted: '#61736D', green: '#146F58', pale: '#E2F3EC', border: '#DCE5E0', red: '#AD3B3B' };
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 22, paddingTop: 15, paddingBottom: 18 },
  brand: { color: colors.ink, fontSize: 26, fontWeight: '800' },
  subtitle: { color: colors.muted, marginTop: 4, fontSize: 13 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 14, backgroundColor: '#E8EEEA', padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 11 },
  activeTab: { backgroundColor: 'white' },
  tabText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  activeTabText: { color: colors.ink },
  content: { padding: 20, paddingBottom: 80, gap: 14 },
  heading: { fontSize: 22, color: colors.ink, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  empty: { color: colors.muted, fontSize: 15, lineHeight: 23, backgroundColor: 'white', padding: 24, borderRadius: 16 },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 5 },
  button: { backgroundColor: colors.pale, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 10, alignSelf: 'flex-start' },
  primaryButton: { backgroundColor: colors.green },
  dangerButton: { backgroundColor: '#FDEBEB' },
  disabledButton: { opacity: 0.45 },
  buttonText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  primaryButtonText: { color: 'white' },
  dangerButtonText: { color: colors.red },
  thumbnail: { width: '100%', height: 210, backgroundColor: '#F2F4F2', borderRadius: 10 },
  saveBox: { gap: 10, backgroundColor: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.ink, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'white', color: colors.ink, padding: 12, borderRadius: 10, fontSize: 16, minWidth: 200 },
  busy: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: colors.ink, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  busyText: { color: 'white', fontWeight: '700' },
  modalShade: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.background, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, gap: 12, maxHeight: '90%' },
  cropPreview: { width: '100%', maxHeight: 260, alignSelf: 'center', backgroundColor: '#DFE8E2', overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  cropOutline: { position: 'absolute', borderWidth: 3, borderColor: colors.green, backgroundColor: '#146F5822' },
  cropRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cropLabel: { flex: 1, color: colors.ink, fontWeight: '600' },
});
