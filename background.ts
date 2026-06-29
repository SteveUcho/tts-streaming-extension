import { DEFAULT_SETTINGS, LocalSettings } from "@/constants";
import { TextProcessor } from "@/textProcessor";
import { getHighlightText } from "@/utils/getHighlightText";

let creating: Promise<void> | null = null; // A global promise to avoid concurrency issues

async function setupOffscreenDocument() {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const path = './src/offscreen/index.html';
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl],
  });

  if (existingContexts.length > 0) {
    return;
  }

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Playing TTS audio in the background'
    });
    await creating;
    creating = null;
  }
}

async function getDefaultSettings(): Promise<LocalSettings> {
  return await chrome.storage.local.get(DEFAULT_SETTINGS as any);
}

// Set up context menu items
function setupContextMenu() {
  chrome.contextMenus.create({
    id: "readAloud",
    title: "Read Aloud",
    contexts: ["selection"]
  });
}

async function playText(text?: string) {
  await setupOffscreenDocument();
  if (!text) {
    text = await getHighlightText();
  }
  const settings = await getDefaultSettings();

  // Process text if enabled
  if (settings.preprocessText) {
    text = TextProcessor.process(text);
  }

  // Start streaming audio
  chrome.runtime.sendMessage({
    type: 'startStreaming',
    text: text,
    settings: settings,
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "readAloud") {
    let text = info.selectionText;

    if (text && tab?.id) {
      playText(text);
    }
  }
});

// Handle messages from popup or offscreen document
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'startStreamingBackground') {
    playText();
  }
});

// Initialize context menu when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
});