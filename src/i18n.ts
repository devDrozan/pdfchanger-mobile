import { File, Paths } from 'expo-file-system';

export type Language = 'en' | 'my';

const translations = {
  en: {
    subtitle: 'Your documents stay on this device.', language: 'Language', library: 'Library', newPdf: 'New PDF', mergePdfs: 'Merge PDFs',
    settings: 'Settings', privacy: 'Privacy', privacyPolicy: 'Privacy Policy', privacyChoices: 'Privacy Choices',
    policyUnavailable: 'The Privacy Policy could not be opened. Check your connection and try again.',
    openPdf: 'Open PDF', openPdfTitle: 'Open in a PDF viewer?',
    openPdfMessage: 'Your device may give another app access to this PDF. That app may save or share it.',
    sharePdf: 'Choose an app', shareInsteadTitle: 'No PDF viewer opened',
    shareInsteadMessage: 'Use your device’s share sheet to choose an app? The chosen app will receive this PDF.',
    privacySharingHelp: 'Opening or sharing a PDF gives another app access to that file. The other app handles it under its own privacy policy.',
    privacyChoicesHelp: 'Manage how ads use your information when privacy choices are available.',
    privacyChoicesNotRequired: 'Privacy choices are not required for this device right now.',
    privacyChoicesUnavailable: 'Privacy choices could not be opened. Please try again later.',
    resetTestConsent: 'Reset EEA test consent',
    yourPdfs: 'Your PDFs', emptyLibrary: 'No PDFs yet. Take a camera photo or import images to make your first one.',
    preview: 'Preview', moveToMerge: 'Move to Merge PDFs', rename: 'Rename', delete: 'Delete',
    createFromPages: 'Create from pages', createHelp: 'Photograph pages or choose images. Adjust and arrange the pages before saving.',
    cameraPhoto: 'Camera photo', photos: 'Photos', imageFiles: 'Image files', page: 'Page', pages: 'pages',
    crop: 'Crop', rotate: 'Rotate', remove: 'Remove', pdfName: 'PDF name', document: 'Document',
    moveUp: 'Move up', moveDown: 'Move down',
    a4Help: 'Each page is fitted to A4 with margins.', savePages: 'Save {count}-page PDF',
    combinePdfs: 'Combine PDFs', mergeHelp: 'Select two or more PDFs. Move them into the order you want their pages to appear.',
    choosePdfs: 'Choose PDFs', recent: 'Recent', recentEmpty: 'PDFs sent from Library will appear here.',
    added: 'Added', addToMerge: 'Add to merge', selectedPdfs: 'Selected PDFs · {count}',
    mergedName: 'Merged PDF name', saveMerged: 'Save merged PDF · {count} pages',
    cropPage: 'Crop page', cropHelp: 'Trim each edge in 5% steps. The outlined area will remain.',
    left: 'Left', right: 'Right', top: 'Top', bottom: 'Bottom', cancel: 'Cancel', applyCrop: 'Apply crop',
    renamePdf: 'Rename PDF', saveName: 'Save name', deleteTitle: 'Delete PDF?', deleteMessage: 'Delete {name} from this app?',
    libraryError: 'Library error', actionError: 'Could not complete action',
    importingImages: 'Importing images…', openingCamera: 'Opening camera…', rotatingPage: 'Rotating page…',
    croppingPage: 'Cropping page…', creatingPdf: 'Creating PDF…', importingPdfs: 'Importing PDFs…',
    addingToMerge: 'Adding to Merge PDFs…', addingPdf: 'Adding PDF…', mergingPdfs: 'Merging PDFs…',
    mergeProcessingHelp: 'Please wait while your PDFs are combined on this device.',
    openingPdf: 'Opening PDF…', deletingPdf: 'Deleting PDF…', renamingPdf: 'Renaming PDF…',
    protectedPdf: 'This PDF is password protected and cannot be merged.',
    unreadablePdf: 'A selected file could not be read as a PDF.',
    noStorage: 'There is not enough free storage to finish this action.',
    genericError: 'Something went wrong. Please try again.',
    cameraPermission: 'Camera permission is needed to photograph a page.',
    addPage: 'Add at least one page.', selectTwo: 'Select at least two PDFs.',
    noViewer: 'No PDF viewer or sharing app is available on this device.',
    noFile: 'A selected file is no longer available.', noLibraryPdf: 'This PDF is no longer available.',
    emptyPdf: 'The PDF is empty.', enterName: 'Enter a name for this PDF.', uniqueName: 'Could not choose a unique file name.',
    invalidImage: 'Image dimensions are invalid.', emptySourcePdf: 'This PDF has no pages.',
    emptySelectedPdf: 'A selected PDF has no pages.', smallCrop: 'The crop area is too small.',
  },
  my: {
    subtitle: 'သင့်စာရွက်စာတမ်းများကို ဤစက်တွင်သာ သိမ်းဆည်းထားသည်။', language: 'ဘာသာစကား', library: 'စုစည်းမှုများ', newPdf: 'PDF အသစ်', mergePdfs: 'PDF ပေါင်းရန်',
    settings: 'ဆက်တင်များ', privacy: 'ကိုယ်ရေးကိုယ်တာ', privacyPolicy: 'ကိုယ်ရေးကိုယ်တာ မူဝါဒ', privacyChoices: 'ကိုယ်ရေးကိုယ်တာ ရွေးချယ်မှုများ',
    policyUnavailable: 'ကိုယ်ရေးကိုယ်တာ မူဝါဒကို ဖွင့်၍ မရပါ။ အင်တာနက်ကို စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။',
    openPdf: 'PDF ဖွင့်ရန်', openPdfTitle: 'PDF ကြည့်ရန် အက်ပ်ဖြင့် ဖွင့်မည်လား။',
    openPdfMessage: 'သင့်စက်သည် ဤ PDF ကို အခြားအက်ပ်တစ်ခုအား ဖတ်ရှုခွင့်ပေးနိုင်သည်။ ထိုအက်ပ်သည် ဖိုင်ကို သိမ်းဆည်း သို့မဟုတ် မျှဝေနိုင်သည်။',
    sharePdf: 'အက်ပ် ရွေးရန်', shareInsteadTitle: 'PDF ကြည့်ရန် အက်ပ် မဖွင့်နိုင်ပါ',
    shareInsteadMessage: 'စက်၏ မျှဝေမှုစာရင်းမှ အက်ပ် ရွေးမည်လား။ ရွေးထားသောအက်ပ်သည် ဤ PDF ကို ရရှိမည်။',
    privacySharingHelp: 'PDF တစ်ခုကို ဖွင့်ခြင်း သို့မဟုတ် မျှဝေခြင်းသည် ထိုဖိုင်ကို အခြားအက်ပ်တစ်ခုအား အသုံးပြုခွင့်ပေးသည်။ ထိုအက်ပ်သည် ၎င်း၏ ကိုယ်ပိုင် ကိုယ်ရေးကိုယ်တာ မူဝါဒအတိုင်း ကိုင်တွယ်သည်။',
    privacyChoicesHelp: 'ရနိုင်သည့်အခါ ကြော်ငြာများအတွက် သင့်အချက်အလက်အသုံးပြုမှုကို စီမံနိုင်သည်။',
    privacyChoicesNotRequired: 'ဤစက်အတွက် ယခု ကိုယ်ရေးကိုယ်တာ ရွေးချယ်မှုများ မလိုအပ်ပါ။',
    privacyChoicesUnavailable: 'ကိုယ်ရေးကိုယ်တာ ရွေးချယ်မှုများကို ဖွင့်၍ မရပါ။ နောက်မှ ထပ်ကြိုးစားပါ။',
    resetTestConsent: 'EEA စမ်းသပ်ခွင့်ပြုချက် ပြန်စရန်',
    yourPdfs: 'သင့် PDF များ', emptyLibrary: 'PDF မရှိသေးပါ။ ကင်မရာဖြင့် ရိုက်ပါ သို့မဟုတ် ပုံများရွေး၍ ပထမဆုံး PDF ကို ဖန်တီးပါ။',
    preview: 'ကြည့်ရန်', moveToMerge: 'ပေါင်းရန် ပို့မည်', rename: 'အမည်ပြောင်း', delete: 'ဖျက်ရန်',
    createFromPages: 'PDF ဖိုင်ဖန်တီးရန်', createHelp: 'စာမျက်နှာများကို ဓာတ်ပုံရိုက်ပါ သို့မဟုတ် ပုံများရွေးပါ။ မသိမ်းမီ ဖြတ်တောက်၊ လှည့်၊ အစီအစဉ်ပြောင်းနိုင်သည်။',
    cameraPhoto: 'ဓာတ်ပုံရိုက်', photos: 'ဓာတ်ပုံများ', imageFiles: 'ပုံဖိုင်များ', page: 'စာမျက်နှာ', pages: 'စာမျက်နှာ',
    crop: 'ဖြတ်တောက်', rotate: 'လှည့်ရန်', remove: 'ဖယ်ရှား', pdfName: 'PDF အမည်', document: 'စာရွက်စာတမ်း',
    moveUp: 'အပေါ်သို့ ရွှေ့', moveDown: 'အောက်သို့ ရွှေ့',
    a4Help: 'စာမျက်နှာတိုင်းကို ဘေးကွက်လပ်ထားပြီး A4 အရွယ်သို့ ချိန်ညှိမည်။', savePages: 'စာမျက်နှာ {count} မျက်နှာပါ PDF သိမ်းရန်',
    combinePdfs: 'PDF များ ပေါင်းရန်', mergeHelp: 'PDF နှစ်ဖိုင်နှင့်အထက် ရွေးပါ။ စာမျက်နှာအစီအစဉ်အတိုင်း ဖိုင်များကို စီပါ။',
    choosePdfs: 'PDF များ ရွေးရန်', recent: 'မကြာသေးမီက', recentEmpty: 'စာကြည့်တိုက်မှ ပို့ထားသော PDF များကို ဤနေရာတွင် ပြမည်။',
    added: 'ထည့်ပြီး', addToMerge: 'ပေါင်းရန် ထည့်', selectedPdfs: 'ရွေးထားသော PDF များ · {count}',
    mergedName: 'ပေါင်းထားသော PDF အမည်', saveMerged: 'စာမျက်နှာ {count} မျက်နှာပါ PDF သိမ်းရန်',
    cropPage: 'စာမျက်နှာ ဖြတ်တောက်ရန်', cropHelp: 'အနားတစ်ဖက်စီကို ၅% စီ ဖြတ်နိုင်သည်။ ဘောင်အတွင်းရှိ အပိုင်းကို သိမ်းမည်။',
    left: 'ဘယ်', right: 'ညာ', top: 'အပေါ်', bottom: 'အောက်', cancel: 'မလုပ်တော့', applyCrop: 'ဖြတ်တောက်မည်',
    renamePdf: 'PDF အမည်ပြောင်းရန်', saveName: 'အမည် သိမ်းရန်', deleteTitle: 'PDF ဖျက်မလား။', deleteMessage: '{name} ကို ဤအက်ပ်မှ ဖျက်မလား။',
    libraryError: 'စာကြည့်တိုက် အမှား', actionError: 'လုပ်ဆောင်ချက် မအောင်မြင်ပါ',
    importingImages: 'ပုံများ ထည့်နေသည်…', openingCamera: 'ကင်မရာ ဖွင့်နေသည်…', rotatingPage: 'စာမျက်နှာ လှည့်နေသည်…',
    croppingPage: 'စာမျက်နှာ ဖြတ်နေသည်…', creatingPdf: 'PDF ဖန်တီးနေသည်…', importingPdfs: 'PDF များ ထည့်နေသည်…',
    addingToMerge: 'ပေါင်းရန် ထည့်နေသည်…', addingPdf: 'PDF ထည့်နေသည်…', mergingPdfs: 'PDF များ ပေါင်းနေသည်…',
    mergeProcessingHelp: 'PDF များကို ဤစက်တွင် ပေါင်းနေစဉ် ခဏစောင့်ပါ။',
    openingPdf: 'PDF ဖွင့်နေသည်…', deletingPdf: 'PDF ဖျက်နေသည်…', renamingPdf: 'PDF အမည်ပြောင်းနေသည်…',
    protectedPdf: 'ဤ PDF တွင် စကားဝှက်ရှိသဖြင့် ပေါင်း၍ မရပါ။',
    unreadablePdf: 'ရွေးထားသောဖိုင်ကို PDF အဖြစ် ဖတ်၍ မရပါ။',
    noStorage: 'ဤလုပ်ဆောင်ချက်အတွက် စက်တွင် နေရာလွတ် မလုံလောက်ပါ။',
    genericError: 'အမှားတစ်ခု ဖြစ်ခဲ့သည်။ ထပ်ကြိုးစားပါ။',
    cameraPermission: 'စာမျက်နှာကို ဓာတ်ပုံရိုက်ရန် ကင်မရာခွင့်ပြုချက် လိုအပ်သည်။',
    addPage: 'စာမျက်နှာ အနည်းဆုံးတစ်မျက်နှာ ထည့်ပါ။', selectTwo: 'PDF အနည်းဆုံး နှစ်ဖိုင် ရွေးပါ။',
    noViewer: 'ဤစက်တွင် PDF ကြည့်ရန် သို့မဟုတ် မျှဝေရန် အက်ပ် မရှိပါ။',
    noFile: 'ရွေးထားသောဖိုင် မရှိတော့ပါ။', noLibraryPdf: 'ဤ PDF မရှိတော့ပါ။',
    emptyPdf: 'PDF ဖိုင်သည် ဗလာဖြစ်သည်။', enterName: 'ဤ PDF အတွက် အမည်ထည့်ပါ။', uniqueName: 'မတူညီသော ဖိုင်အမည် ရွေး၍ မရပါ။',
    invalidImage: 'ပုံအရွယ်အစား မမှန်ကန်ပါ။', emptySourcePdf: 'ဤ PDF တွင် စာမျက်နှာ မရှိပါ။',
    emptySelectedPdf: 'ရွေးထားသော PDF တွင် စာမျက်နှာ မရှိပါ။', smallCrop: 'ဖြတ်တောက်ရန် ရွေးထားသောအပိုင်း သေးလွန်းသည်။',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function translate(language: Language, key: TranslationKey, values: Record<string, string | number> = {}): string {
  const template: string = translations[language][key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

const languageFile = new File(Paths.document, 'language.json');

export async function loadLanguage(): Promise<Language> {
  if (!languageFile.exists) return 'en';
  try {
    const saved: unknown = JSON.parse(await languageFile.text());
    return saved === 'my' ? 'my' : 'en';
  } catch { return 'en'; }
}

export async function saveLanguage(language: Language): Promise<void> {
  const temporary = new File(Paths.document, `language-${Date.now()}.tmp`);
  try {
    temporary.create();
    await temporary.write(JSON.stringify(language));
    await temporary.move(languageFile, { overwrite: true });
  } finally {
    if (temporary.exists) temporary.delete();
  }
}
