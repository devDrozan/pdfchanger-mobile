import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Image, KeyboardAvoidingView, Linking, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as SplashScreen from 'expo-splash-screen';
import { deletePdf, listLibrary, previewPdf, readBytes, renamePdf, savePdf, type LibraryItem } from './src/files';
import { cropPage, makePage, normalizedImage, rotatePage, type ImagePage } from './src/images';
import { addRecentMerge, listRecentMerge, removeRecentMerge, replaceRecentMergeName } from './src/mergeRecent';
import { imagesToPdf, mergePdfs, pdfPageCount } from './src/pdfCore';
import { loadLanguage, saveLanguage, translate, type Language, type TranslationKey } from './src/i18n';
import TestBannerAd from "./src/components/TestBannerAd";
import MergeTestBannerAd from './src/components/MergeTestBannerAd';
import mobileAds, {
  AdsConsent,
  AdsConsentDebugGeography,
  AdsConsentPrivacyOptionsRequirementStatus,
  type AdsConsentInfo,
  type AdsConsentInfoOptions,
} from "react-native-google-mobile-ads";
type Screen = 'library' | 'create' | 'merge' | 'settings';
type MergeInput = { id: string; name: string; uri: string; pages: number };
type CropEdges = { left: number; right: number; top: number; bottom: number };
const emptyEdges: CropEdges = { left: 0, right: 0, top: 0, bottom: 0 };
const launchStartedAt = Date.now();
const minimumSplashTimeMs = 5000;
const minimumMergePopupTimeMs = 10000;
const privacyPolicyUrl = 'https://devdrozan.github.io/pdfchanger/';

function consentOptions(): AdsConsentInfoOptions {
  return isAndroidEmulatorConsentTest()
    ? { debugGeography: AdsConsentDebugGeography.EEA }
    : {};
}

function isAndroidEmulatorConsentTest(): boolean {
  if (!__DEV__ || Platform.OS !== 'android') return false;
  const fingerprint = Platform.constants.Fingerprint.toLowerCase();
  return fingerprint.includes('sdk_gphone') || fingerprint.startsWith('generic/') || fingerprint.startsWith('sdk/');
}

void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 200 });


function errorText(error: unknown, language: Language) {
  const message = error instanceof Error ? error.message : String(error);
  const known: Record<string, TranslationKey> = {
    'Camera permission is needed to photograph a page.': 'cameraPermission',
    'Add at least one page.': 'addPage',
    'Select at least two PDFs.': 'selectTwo',
    'No PDF viewer or sharing app is available on this device.': 'noViewer',
    'A selected file is no longer available.': 'noFile',
    'This PDF is no longer available.': 'noLibraryPdf',
    'The PDF is empty.': 'emptyPdf',
    'Enter a name for this PDF.': 'enterName',
    'Could not choose a unique file name.': 'uniqueName',
    'Image dimensions are invalid.': 'invalidImage',
    'This PDF has no pages.': 'emptySourcePdf',
    'A selected PDF has no pages.': 'emptySelectedPdf',
    'The crop area is too small.': 'smallCrop',
  };
  if (known[message]) return translate(language, known[message]);
  if (/encrypt|password/i.test(message)) return translate(language, 'protectedPdf');
  if (/PDFDocument|PDF header|PDF catalog|Failed to parse PDF/i.test(message)) return translate(language, 'unreadablePdf');
  if (/space|storage|quota|ENOSPC/i.test(message)) return translate(language, 'noStorage');
  return message || translate(language, 'genericError');
}

function Button({ title, accessibilityLabel, onPress, kind = 'secondary', disabled = false }: {
  title: string; accessibilityLabel?: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
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
  const [recentMerge, setRecentMerge] = useState<LibraryItem[]>([]);
  const [pages, setPages] = useState<ImagePage[]>([]);
  const [mergeInputs, setMergeInputs] = useState<MergeInput[]>([]);
  const [name, setName] = useState('Document');
  const [busy, setBusy] = useState('');
  const [mergeProcessing, setMergeProcessing] = useState(false);
  const [cropId, setCropId] = useState<string | null>(null);
  const [edges, setEdges] = useState<CropEdges>(emptyEdges);
  const [renameItem, setRenameItem] = useState<LibraryItem | null>(null);
  const [renameText, setRenameText] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [languageReady, setLanguageReady] = useState(false);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [libraryReady, setLibraryReady] = useState(false);
  const [splashOverlayReady, setSplashOverlayReady] = useState(false);
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const t = (key: TranslationKey, values?: Record<string, string | number>) => translate(language, key, values);
  const [adsReady, setAdsReady] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);

  async function applyConsentInfo(info: AdsConsentInfo) {
    setPrivacyOptionsRequired(info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED);
    setAdsReady(false);
    if (info.canRequestAds) {
      await mobileAds().initialize();
      setAdsReady(true);
    }
  }

  useEffect(() => {
    let active = true;
    AdsConsent.gatherConsent(consentOptions()).then(async (info) => {
      if (active) await applyConsentInfo(info);
    }).catch(async (error) => {
      console.warn('AdMob consent failed:', error);
      try {
        const info = await AdsConsent.getConsentInfo();
        if (active) await applyConsentInfo(info);
      } catch (fallbackError) { console.warn('AdMob consent fallback failed:', fallbackError); }
    });
    return () => { active = false; };
  }, []);

  async function openPrivacyChoices() {
    if (consentBusy || !privacyOptionsRequired) return;
    setConsentBusy(true);
    try { await applyConsentInfo(await AdsConsent.showPrivacyOptionsForm()); }
    catch (error) {
      console.warn('Privacy choices failed:', error);
      Alert.alert(t('actionError'), t('privacyChoicesUnavailable'));
    } finally { setConsentBusy(false); }
  }

  async function resetTestConsent() {
    if (!isAndroidEmulatorConsentTest() || consentBusy) return;
    setConsentBusy(true);
    setAdsReady(false);
    try {
      AdsConsent.reset();
      await applyConsentInfo(await AdsConsent.gatherConsent(consentOptions()));
    } catch (error) {
      console.warn('EEA consent test failed:', error);
      Alert.alert(t('actionError'), t('privacyChoicesUnavailable'));
    } finally { setConsentBusy(false); }
  }


  useEffect(() => {
    loadLanguage().then((saved) => {
      setLanguage(saved);
      setName((current) => current === 'Document' ? translate(saved, 'document') : current);
    }).catch(() => setLanguage('en')).finally(() => setLanguageReady(true));
  }, []);

  async function changeLanguage(next: Language) {
    if (next === language || languageSaving) return;
    setLanguageSaving(true);
    try {
      await saveLanguage(next);
      setLanguage(next);
      setName((current) => current === translate(language, 'document') ? translate(next, 'document') : current);
    } catch (error) {
      Alert.alert(t('actionError'), errorText(error, language));
    } finally { setLanguageSaving(false); }
  }

  const refresh = useCallback(async () => {
    const items = await listLibrary();
    setLibrary(items);
    setRecentMerge(await listRecentMerge(items));
  }, []);
  useEffect(() => {
    refresh().catch((error) => Alert.alert(t('libraryError'), errorText(error, language)))
      .finally(() => setLibraryReady(true));
  }, [refresh, language]);

  useEffect(() => {
    if (!languageReady || !libraryReady || !splashOverlayReady) return;
    let cancelled = false;
    const remainingMs = Math.max(0, minimumSplashTimeMs - (Date.now() - launchStartedAt));
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync().catch(() => {});
      if (cancelled) return;
      Animated.timing(splashOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
        .start(() => setShowSplashOverlay(false));
    }, remainingMs);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [languageReady, libraryReady, splashOverlayReady, splashOpacity]);

  async function work(label: string, task: () => Promise<void>) {
    if (busy) return;
    setBusy(label);
    try { await task(); }
    catch (error) { Alert.alert(t('actionError'), errorText(error, language)); }
    finally { setBusy(''); }
  }

  function updatePage(updated: ImagePage) {
    setPages((current) => current.map((page) => page.id === updated.id ? updated : page));
  }

  function importImages() {
    work(t('importingImages'), async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 1 });
      if (result.canceled) return;
      const added = await Promise.all(result.assets.map((asset) => makePage(asset.uri)));
      setPages((current) => [...current, ...added]);
    });
  }

  function cameraPhoto() {
    work(t('openingCamera'), async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error('Camera permission is needed to photograph a page.');
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled) return;
      const added = await Promise.all(result.assets.map((asset) => makePage(asset.uri)));
      setPages((current) => [...current, ...added]);
    });
  }

  function importImageFiles() {
    work(t('importingImages'), async () => {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const added = await Promise.all(result.assets.map((asset) => makePage(asset.uri)));
      setPages((current) => [...current, ...added]);
    });
  }

  function rotate(page: ImagePage) {
    work(t('rotatingPage'), async () => updatePage(await rotatePage(page)));
  }

  function applyCrop() {
    const page = pages.find((item) => item.id === cropId);
    if (!page) return;
    work(t('croppingPage'), async () => {
      updatePage(await cropPage(page, edges));
      setCropId(null);
      setEdges(emptyEdges);
    });
  }

  function saveImages() {
    work(t('creatingPdf'), async () => {
      if (!pages.length) throw new Error('Add at least one page.');
      const normalized = [];
      for (const page of pages) normalized.push(await normalizedImage(page));
      await savePdf(name, await imagesToPdf(normalized));
      setPages([]);
      setName(t('document'));
      await refresh();
      setScreen('library');
    });
  }

  function importPdfs() {
    work(t('importingPdfs'), async () => {
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

  async function selectLibraryPdf(item: LibraryItem) {
    if (mergeInputs.some((input) => input.uri === item.uri)) return;
    const pages = await pdfPageCount(await readBytes(item.uri));
    setMergeInputs((current) => current.some((input) => input.uri === item.uri) ? current : [
      ...current,
      { id: item.uri, name: item.name, uri: item.uri, pages },
    ]);
  }

  function moveToMerge(item: LibraryItem) {
    work(t('addingToMerge'), async () => {
      await selectLibraryPdf(item);
      await addRecentMerge(item.name);
      await refresh();
      setScreen('merge');
    });
  }

  function addFromRecent(item: LibraryItem) {
    work(t('addingPdf'), async () => {
      await selectLibraryPdf(item);
      await addRecentMerge(item.name);
      await refresh();
    });
  }

  function saveMerge() {
    work(t('mergingPdfs'), async () => {
      if (mergeInputs.length < 2) throw new Error('Select at least two PDFs.');
      const startedAt = Date.now();
      setMergeProcessing(true);
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
        const inputs = [];
        for (const item of mergeInputs) inputs.push(await readBytes(item.uri));
        await savePdf(name, await mergePdfs(inputs));
        await refresh();
        await new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, minimumMergePopupTimeMs - (Date.now() - startedAt))));
        setMergeInputs([]);
        setName(t('document'));
        setScreen('library');
      } catch (error) {
        setTimeout(() => Alert.alert(t('actionError'), errorText(error, language)), 250);
      } finally {
        setMergeProcessing(false);
      }
    });
  }

  async function openPdf(item: { name: string; uri: string }) {
    try { await previewPdf(item); }
    catch {
      if (!await Sharing.isAvailableAsync()) throw new Error('No PDF viewer or sharing app is available on this device.');
      Alert.alert(t('shareInsteadTitle'), t('shareInsteadMessage'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('sharePdf'), onPress: () => { void work(t('openingPdf'), () => Sharing.shareAsync(item.uri, { mimeType: 'application/pdf' })); } },
      ]);
    }
  }

  function confirmOpenPdf(item: { name: string; uri: string }) {
    Alert.alert(t('openPdfTitle'), t('openPdfMessage'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('openPdf'), onPress: () => { void work(t('openingPdf'), () => openPdf(item)); } },
    ]);
  }

  async function openPrivacyPolicy() {
    try { await Linking.openURL(privacyPolicyUrl); }
    catch { Alert.alert(t('actionError'), t('policyUnavailable')); }
  }

  function confirmDelete(item: LibraryItem) {
    Alert.alert(t('deleteTitle'), t('deleteMessage', { name: item.name }), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => work(t('deletingPdf'), async () => {
        deletePdf(item);
        await removeRecentMerge(item.name);
        setMergeInputs((current) => current.filter((input) => input.uri !== item.uri));
        await refresh();
      }) },
    ]);
  }

  function submitRename() {
    if (!renameItem) return;
    work(t('renamingPdf'), async () => {
      const renamed = await renamePdf(renameItem, renameText);
      await replaceRecentMergeName(renameItem.name, renamed.name);
      setMergeInputs((current) => current.map((input) => input.uri === renameItem.uri
        ? { ...input, name: renamed.name, uri: renamed.uri, id: renamed.uri }
        : input));
      setRenameItem(null);
      await refresh();
    });
  }

  const cropPageItem = pages.find((item) => item.id === cropId);
  const appReady = languageReady && libraryReady;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      {appReady && <>
      <View style={styles.header}>
        <Image source={require('./assets/logo.png')} style={styles.logo} />
        <View style={styles.headerCopy}>
          <Text style={styles.brand}>PDF Changer</Text>
          <Text style={styles.subtitle}>{t('subtitle')}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('settings')}
          accessibilityState={{ selected: screen === 'settings' }} onPress={() => setScreen('settings')}
          style={[styles.settingsButton, __DEV__ && Platform.OS === 'android' && styles.settingsButtonDev]}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.languageRow}>
        <Text style={styles.languageLabel}>{t('language')}</Text>
        <View style={styles.languageToggle}>
          {([['en', 'English'], ['my', 'မြန်မာ']] as const).map(([code, label]) => (
            <TouchableOpacity key={code} accessibilityRole="button" accessibilityLabel={label}
              accessibilityState={{ selected: language === code, disabled: languageSaving }} disabled={languageSaving} onPress={() => changeLanguage(code)}
              style={[styles.languageOption, language === code && styles.languageOptionActive]}>
              <Text style={[styles.languageText, language === code && styles.languageTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.tabs}>
        {([['library', t('library')], ['create', t('newPdf')], ['merge', t('mergePdfs')]] as const).map(([key, label]) => (
          <TouchableOpacity key={key} accessibilityRole="tab" accessibilityState={{ selected: screen === key }} onPress={() => setScreen(key)} style={[styles.tab, screen === key && styles.activeTab]}>
            <Text style={[styles.tabText, screen === key && styles.activeTabText]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {screen === 'library' && <>
          <Text style={styles.heading}>{t('yourPdfs')}</Text>
          {library.length === 0 ? <Text style={styles.empty}>{t('emptyLibrary')}</Text> : library.map((item) => (
            <View key={item.uri} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.meta}>{Math.max(1, Math.round(item.size / 1024))} KB</Text>
              <View style={styles.actions}>
                <Button title={t('openPdf')} onPress={() => confirmOpenPdf(item)} disabled={!!busy} />
                <Button title={t('moveToMerge')} onPress={() => moveToMerge(item)} disabled={!!busy} />
                <Button title={t('rename')} onPress={() => { setRenameItem(item); setRenameText(item.name.replace(/\.pdf$/i, '')); }} disabled={!!busy} />
                <Button title={t('delete')} kind="danger" onPress={() => confirmDelete(item)} disabled={!!busy} />
              </View>
            </View>
          ))}
        </>}
        {screen === 'create' && <>
          <Text style={styles.heading}>{t('createFromPages')}</Text>
          <Text style={styles.body}>{t('createHelp')}</Text>
          <View style={styles.actions}><Button title={t('cameraPhoto')} kind="primary" onPress={cameraPhoto} disabled={!!busy} /><Button title={t('photos')} onPress={importImages} disabled={!!busy} /><Button title={t('imageFiles')} onPress={importImageFiles} disabled={!!busy} /></View>
          {pages.map((page, index) => (
            <View key={page.id} style={styles.card}>
              <Text style={styles.cardTitle}>{t('page')} {index + 1}</Text>
              <Image source={{ uri: page.uri }} style={styles.thumbnail} resizeMode="contain" />
              <View style={styles.actions}>
                <Button title={t('crop')} onPress={() => { setCropId(page.id); setEdges(emptyEdges); }} disabled={!!busy} />
                <Button title={t('rotate')} onPress={() => rotate(page)} disabled={!!busy} />
                <Button title="↑" accessibilityLabel={t('moveUp')} onPress={() => setPages((current) => move(current, index, -1))} disabled={!!busy || index === 0} />
                <Button title="↓" accessibilityLabel={t('moveDown')} onPress={() => setPages((current) => move(current, index, 1))} disabled={!!busy || index === pages.length - 1} />
                <Button title={t('remove')} kind="danger" onPress={() => setPages((current) => current.filter((item) => item.id !== page.id))} disabled={!!busy} />
              </View>
            </View>
          ))}
          {pages.length > 0 && <View style={styles.saveBox}>
            <Text style={styles.label}>{t('pdfName')}</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={80} placeholder={t('document')} />
            <Text style={styles.meta}>{t('a4Help')}</Text>
            <Button title={t('savePages', { count: pages.length })} kind="primary" onPress={saveImages} disabled={!!busy} />
          </View>}
        </>}
        {screen === 'merge' && <>
          <Text style={styles.heading}>{t('combinePdfs')}</Text>
          <Text style={styles.body}>{t('mergeHelp')}</Text>
          <Button title={t('choosePdfs')} kind="primary" onPress={importPdfs} disabled={!!busy} />
          <Text style={styles.sectionTitle}>{t('recent')}</Text>
          {recentMerge.length === 0 ? <Text style={styles.meta}>{t('recentEmpty')}</Text> : recentMerge.map((item) => {
            const selected = mergeInputs.some((input) => input.uri === item.uri);
            return <View key={item.uri} style={styles.recentRow}>
              <Text style={styles.recentName} numberOfLines={2}>{item.name}</Text>
              <Button title={selected ? t('added') : t('addToMerge')} onPress={() => addFromRecent(item)} disabled={!!busy || selected} />
            </View>;
          })}
          <Text style={styles.sectionTitle}>{t('selectedPdfs', { count: mergeInputs.length })}</Text>
          {mergeInputs.map((item, index) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{index + 1}. {item.name}</Text>
              <Text style={styles.meta}>{item.pages} {t(item.pages === 1 ? 'page' : 'pages')}</Text>
              <View style={styles.actions}>
                <Button title={t('openPdf')} onPress={() => confirmOpenPdf(item)} disabled={!!busy} />
                <Button title="↑" accessibilityLabel={t('moveUp')} onPress={() => setMergeInputs((current) => move(current, index, -1))} disabled={!!busy || index === 0} />
                <Button title="↓" accessibilityLabel={t('moveDown')} onPress={() => setMergeInputs((current) => move(current, index, 1))} disabled={!!busy || index === mergeInputs.length - 1} />
                <Button title={t('remove')} kind="danger" onPress={() => setMergeInputs((current) => current.filter((source) => source.id !== item.id))} disabled={!!busy} />
              </View>
            </View>
          ))}
          {mergeInputs.length >= 2 && <View style={styles.saveBox}>
            <Text style={styles.label}>{t('mergedName')}</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={80} placeholder={t('document')} />
            <Button title={t('saveMerged', { count: mergeInputs.reduce((total, item) => total + item.pages, 0) })} kind="primary" onPress={saveMerge} disabled={!!busy} />
          </View>}
        </>}
        {screen === 'settings' && <>
          <Text style={styles.heading}>{t('settings')}</Text>
          <Text style={styles.sectionTitle}>{t('privacy')}</Text>
          <Text style={styles.body}>{t('privacySharingHelp')}</Text>
          <Text style={styles.body}>{t('privacyChoicesHelp')}</Text>
          <Button title={t('privacyPolicy')} onPress={() => { void openPrivacyPolicy(); }} />
          {privacyOptionsRequired
            ? <Button title={t('privacyChoices')} kind="primary" onPress={openPrivacyChoices} disabled={consentBusy} />
            : <Text style={styles.meta}>{t('privacyChoicesNotRequired')}</Text>}
          {isAndroidEmulatorConsentTest() && <Button title={t('resetTestConsent')} onPress={resetTestConsent} disabled={consentBusy} />}
        </>}
      </ScrollView>
      {screen === 'library' && adsReady && <TestBannerAd />}
      {!!busy && !mergeProcessing && <View style={styles.busy}><Text style={styles.busyText}>{busy}</Text></View>}

      <Modal visible={mergeProcessing} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.mergePopupShade} accessibilityViewIsModal>
          <View style={styles.mergePopup}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.mergePopupTitle} accessibilityLiveRegion="polite">{t('mergingPdfs')}</Text>
            <Text style={styles.mergePopupBody}>{t('mergeProcessingHelp')}</Text>
          </View>
          {adsReady && <View style={styles.mergeAdArea}>
            <MergeTestBannerAd />
          </View>}
        </View>
      </Modal>

      <Modal visible={!!cropPageItem} transparent animationType="slide" onRequestClose={() => setCropId(null)}>
        <View style={styles.modalShade}><View style={styles.modalSheet}>
          <Text style={styles.heading}>{t('cropPage')}</Text>
          <Text style={styles.body}>{t('cropHelp')}</Text>
          {cropPageItem && <View style={[styles.cropPreview, { aspectRatio: cropPageItem.width / cropPageItem.height }]}>
            <Image source={{ uri: cropPageItem.uri }} style={styles.fill} resizeMode="stretch" />
            <View pointerEvents="none" style={[styles.cropOutline, { left: `${edges.left}%`, right: `${edges.right}%`, top: `${edges.top}%`, bottom: `${edges.bottom}%` }]} />
          </View>}
          {(['left', 'right', 'top', 'bottom'] as const).map((edge) => (
            <View key={edge} style={styles.cropRow}>
              <Text style={styles.cropLabel}>{t(edge)} · {edges[edge]}%</Text>
              <Button title="−" onPress={() => setEdges((current) => ({ ...current, [edge]: Math.max(0, current[edge] - 5) }))} disabled={edges[edge] === 0 || !!busy} />
              <Button title="+" onPress={() => setEdges((current) => {
                const opposite = edge === 'left' ? 'right' : edge === 'right' ? 'left' : edge === 'top' ? 'bottom' : 'top';
                return { ...current, [edge]: Math.min(90, 95 - current[opposite], current[edge] + 5) };
              })} disabled={edges[edge] >= 90 || (edge === 'left' || edge === 'right' ? edges.left + edges.right : edges.top + edges.bottom) >= 95 || !!busy} />
            </View>
          ))}
          <View style={styles.actions}><Button title={t('cancel')} onPress={() => setCropId(null)} disabled={!!busy} /><Button title={t('applyCrop')} kind="primary" onPress={applyCrop} disabled={!!busy || Object.values(edges).every((value) => value === 0)} /></View>
        </View></View>
      </Modal>

      <Modal visible={!!renameItem} transparent animationType="fade" onRequestClose={() => setRenameItem(null)}>
        <KeyboardAvoidingView style={styles.modalShade} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={styles.modalSheet}>
          <Text style={styles.heading}>{t('renamePdf')}</Text>
          <TextInput autoFocus style={styles.input} value={renameText} onChangeText={setRenameText} maxLength={80} selectTextOnFocus returnKeyType="done" onSubmitEditing={submitRename} />
          <View style={styles.actions}><Button title={t('cancel')} onPress={() => setRenameItem(null)} disabled={!!busy} /><Button title={t('saveName')} kind="primary" onPress={submitRename} disabled={!!busy || !renameText.trim()} /></View>
        </View></KeyboardAvoidingView>
      </Modal>
      </>}
      {showSplashOverlay && <Animated.View
        accessibilityRole="image" accessibilityLabel="PDF Changer"
        onLayout={() => setSplashOverlayReady(true)}
        style={[styles.splashOverlay, { opacity: splashOpacity }]}>
        <Image source={require('./assets/logo.png')} style={styles.splashLogo} resizeMode="contain" />
      </Animated.View>}
    </SafeAreaView>
  );
}

const colors = { background: '#F5F7F5', ink: '#18332D', muted: '#61736D', green: '#146F58', pale: '#E2F3EC', border: '#DCE5E0', red: '#AD3B3B' };
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0 },
  splashOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  splashLogo: { width: 190, height: 190 },
  header: { paddingHorizontal: 22, paddingTop: 15, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1 },
  settingsButton: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pale },
  settingsButtonDev: { marginRight: 56 },
  settingsIcon: { color: colors.ink, fontSize: 24 },
  logo: { width: 48, height: 48, borderRadius: 11 },
  brand: { color: colors.ink, fontSize: 26, fontWeight: '800' },
  subtitle: { color: colors.muted, marginTop: 4, fontSize: 13, lineHeight: 20 },
  languageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  languageLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  languageToggle: { flexDirection: 'row', backgroundColor: '#E8EEEA', padding: 3, borderRadius: 10 },
  languageOption: { paddingHorizontal: 12, paddingTop: 5, paddingBottom: 9, borderRadius: 8 },
  languageOptionActive: { backgroundColor: 'white' },
  languageText: { color: colors.muted, fontSize: 13, fontWeight: '700', includeFontPadding: false },
  languageTextActive: { color: colors.ink },
  tabs: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 14, backgroundColor: '#E8EEEA', padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingTop: 9, paddingBottom: 13, borderRadius: 11 },
  activeTab: { backgroundColor: 'white' },
  tabText: { color: colors.muted, fontWeight: '600', fontSize: 13, textAlign: 'center', includeFontPadding: false },
  activeTabText: { color: colors.ink },
  content: { padding: 20, paddingBottom: 80, gap: 14 },
  heading: { fontSize: 22, lineHeight: 32, color: colors.ink, fontWeight: '800' },
  sectionTitle: { fontSize: 17, lineHeight: 26, color: colors.ink, fontWeight: '800', marginTop: 8 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 26 },
  empty: { color: colors.muted, fontSize: 15, lineHeight: 26, backgroundColor: 'white', padding: 24, borderRadius: 16 },
  card: { backgroundColor: 'white', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  cardTitle: { color: colors.ink, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: 'white', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  recentName: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 5 },
  button: { backgroundColor: colors.pale, paddingHorizontal: 13, paddingTop: 8, paddingBottom: 12, borderRadius: 10, alignSelf: 'flex-start' },
  primaryButton: { backgroundColor: colors.green },
  dangerButton: { backgroundColor: '#FDEBEB' },
  disabledButton: { opacity: 0.45 },
  buttonText: { color: colors.ink, fontWeight: '700', fontSize: 14, lineHeight: 22, includeFontPadding: false },
  primaryButtonText: { color: 'white' },
  dangerButtonText: { color: colors.red },
  thumbnail: { width: '100%', height: 210, backgroundColor: '#F2F4F2', borderRadius: 10 },
  saveBox: { gap: 10, backgroundColor: 'white', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.ink, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'white', color: colors.ink, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14, borderRadius: 10, fontSize: 16, minWidth: 200, includeFontPadding: false, textAlignVertical: 'center' },
  busy: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: colors.ink, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  busyText: { color: 'white', fontWeight: '700' },
  mergePopupShade: { flex: 1, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center', padding: 24 },
  mergePopup: { width: '100%', maxWidth: 340, alignItems: 'center', gap: 16, backgroundColor: colors.background, padding: 28, borderRadius: 20 },
  mergePopupTitle: { color: colors.ink, fontSize: 20, lineHeight: 30, fontWeight: '800', textAlign: 'center', includeFontPadding: false },
  mergePopupBody: { color: colors.muted, fontSize: 15, lineHeight: 24, textAlign: 'center', includeFontPadding: false },
  mergeAdArea: { position: 'absolute', bottom: 20, left: 16, right: 16, alignItems: 'center' },
  modalShade: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.background, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 22, gap: 12, maxHeight: '90%' },
  cropPreview: { width: '100%', maxHeight: 260, alignSelf: 'center', backgroundColor: '#DFE8E2', overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  cropOutline: { position: 'absolute', borderWidth: 3, borderColor: colors.green, backgroundColor: '#146F5822' },
  cropRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cropLabel: { flex: 1, color: colors.ink, fontWeight: '600' },
});
