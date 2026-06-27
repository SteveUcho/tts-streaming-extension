import { TextProcessor } from "./src/textProcessor";

let isRecording = false;
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

    if (text) {
      processAndReadText(text, tab?.id);
      // If no text is selected, get the page content
      // chrome.scripting.executeScript({
      //   target: { tabId: tab?.id },
      //   function: () => {
      //     return document.body.innerText;
      //   }
      // }).then(results => {
      //   if (results && results[0] && results[0].result) {
      //     processAndReadText(results[0].result, tab.id);
      //   }
      // });
    }
  }
});

// Process and read text with default settings
async function processAndReadText(text: string, tabId: number | undefined) {
  try {
    // Get default settings
    const settings = await chrome.storage.local.get({
      serverUrl: 'http://localhost:8000/v1/audio/speech',
      voice: 'af_bella',
      speed: 1,
      recordAudio: false,
      preprocessText: true
    });

    // Process text if enabled
    if (settings.preprocessText && tabId) {
      try {
        // Inject the text processor script if needed
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['textProcessor.js']
        });

        // Process the text
        const result = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: (textToProcess) => {
            return TextProcessor.process(textToProcess);
          },
          args: [text]
        });

        if (result?.[0]?.result) {
          text = result[0].result;
        }
      } catch (error) {
        console.error('Error processing text:', error);
        // Fall back to using the original text
      }
    }

    // Set state to loading
    currentPlayerState = 'loading';
    chrome.runtime.sendMessage({
      type: 'playerStateUpdate',
      state: 'loading'
    });

    // Start streaming audio
    startStreamingAudio(text, settings);
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
      isRecording = message.record;
      // Set state to loading before starting the audio stream
      currentPlayerState = 'loading';
      chrome.runtime.sendMessage({
        type: 'playerStateUpdate',
        state: 'loading'
      });
      startStreamingAudio(message.text, message.settings);
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
async function startStreamingAudio(text: string, settings: any) {
  try {
    await setupOffscreenDocument();

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
        speed: Number.parseFloat(settings.speed)
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
      isRecording: isRecording
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