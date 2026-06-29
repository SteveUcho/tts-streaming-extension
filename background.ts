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

  let success = false;
  let failTimer: NodeJS.Timeout | null = null;
  while (!success) {
    try {
      // Start streaming audio
      success = await chrome.runtime.sendMessage({
        type: 'startStreaming',
        text: text,
        settings: settings,
      });

      if (failTimer) {
        clearTimeout(failTimer);
      }
    } catch (error) {
      console.error('Will retry in 50ms:', error);
      failTimer ??= setTimeout(() => {
        success = true;
        chrome.runtime.sendMessage({
          type: 'streamError',
          error: 'Failed to start streaming',
        });
      }, 1000);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
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

// Set up context menu items
function setupContextMenu() {
  chrome.contextMenus.create({
    id: "readAloud",
    title: "Read Aloud",
    contexts: ["selection"]
  });
}

// Initialize context menu when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
});