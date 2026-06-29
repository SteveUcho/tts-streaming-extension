import { TextProcessor } from "./src/textProcessor";
import { DEFAULT_SETTINGS, LocalSettings } from "./src/popup/constants";

let currentPlayerState = 'stopped';
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

// Set up context menu items
function setupContextMenu() {
  chrome.contextMenus.create({
    id: "readAloud",
    title: "Read Aloud",
    contexts: ["selection", "page"]
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readAloud") {
    let text = info.selectionText;

    if (text && tab?.id) {
      processAndReadText(text);
    }
  }
});

function getDefaultSettings(): Promise<LocalSettings> {
  return chrome.storage.local.get(DEFAULT_SETTINGS as any);
}

// Process and read text with default settings
async function processAndReadText(text: string) {
  try {
    // Get default settings
    const settings = await getDefaultSettings();

    // Process text if enabled
    if (settings.preprocessText) {
      text = TextProcessor.process(text);
    }

    // Set state to loading
    currentPlayerState = 'loading';
    chrome.runtime.sendMessage({
      type: 'playerStateUpdate',
      state: 'loading'
    });

    // Start streaming audio
    startStreamingAudio(text);
  } catch (error) {
    console.error('Error in processAndReadText:', error);
    chrome.runtime.sendMessage({
      type: 'streamError',
      error: (error as Error).message
    });
  }
}

// Handle messages from popup or offscreen document
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'setupOffscreen':
      setupOffscreenDocument().then(() => sendResponse({ success: true }));
      return true;

    case 'startStreaming':
      processAndReadText(message.text);
      sendResponse({ success: true });
      return true;

    case 'controlAudio':
      chrome.runtime.sendMessage({
        type: message.action,
        data: message.data
      });
      return true;

    case 'stateUpdate':
      currentPlayerState = message.state;
      chrome.runtime.sendMessage({
        type: 'playerStateUpdate',
        state: message.state
      });
      return true;

    case 'audioReady':
      // Audio is ready but not yet playing
      if (currentPlayerState === 'loading') {
        currentPlayerState = 'ready';
        chrome.runtime.sendMessage({
          type: 'playerStateUpdate',
          state: 'ready'
        });
      }
      return true;

    case 'getPlayerState':
      sendResponse({ state: currentPlayerState });
      return true;

    case 'seek':
      chrome.runtime.sendMessage({
        type: 'seek',
        time: message.time
      }, (response) => {
        sendResponse(response);
      });
      return true;

    case 'getTimeInfo':
      chrome.runtime.sendMessage({
        type: 'getTimeInfo'
      }).then((response) => {
        sendResponse(response);
      });
      return true;

    // case 'timeUpdate':
    //   // Forward time updates to the popup
    //   chrome.runtime.sendMessage(message);
    //   return true;
  }
});

// Start streaming audio from the TTS server
async function startStreamingAudio(text: string) {
  try {
    await setupOffscreenDocument();

    const settings = await getDefaultSettings();

    const response = await fetch(settings.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg, audio/wav, audio/*'
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: settings.voice,
        input: text,
        speed: Number.parseFloat(settings.speed.toString())
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the audio data as a blob
    const audioBlob = await response.blob();
    const mimeType = audioBlob.type || 'audio/mpeg';

    // Convert blob to array buffer to send to offscreen document
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Send the audio data to the offscreen document
    chrome.runtime.sendMessage({
      type: 'processAudioData',
      audioData: Array.from(new Uint8Array(arrayBuffer)),
      mimeType: mimeType,
      isRecording: settings.recordAudio
    });
  } catch (error) {
    console.error('Error streaming audio:', error);
    chrome.runtime.sendMessage({
      type: 'streamError',
      error: (error as Error).message
    });

    // Update state to stopped on error
    currentPlayerState = 'stopped';
    chrome.runtime.sendMessage({
      type: 'playerStateUpdate',
      state: 'stopped'
    });
  }
}

// Initialize context menu when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
});