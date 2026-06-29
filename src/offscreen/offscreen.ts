import { LocalSettings } from "@/constants";

const audioElement = document.getElementById('audioElement') as HTMLAudioElement;
let currentPlayerState = 'stopped';

// Process and read text with default settings
function processAndReadText(text: string, settings: LocalSettings) {
  // Set state to loading
  currentPlayerState = 'loading';
  chrome.runtime.sendMessage({
    type: 'playerStateUpdate',
    state: 'loading'
  });

  // Start streaming audio
  startStreamingAudio(text, settings);
}

// Start streaming audio from the TTS server
async function startStreamingAudio(text: string, settings: LocalSettings) {
  try {
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
    // Create URL for the blob
    const audioUrl = URL.createObjectURL(audioBlob);

    // If recording is enabled, send URL back for download
    if (settings.recordAudio) {
      chrome.runtime.sendMessage({
        type: 'recordingComplete',
        audioUrl: audioUrl
      });
    }

    // Set up audio element
    audioElement.src = audioUrl;

    // Start playing
    audioElement.play().catch(err => {
      console.error('Play error:', err);
      chrome.runtime.sendMessage({
        type: 'streamError',
        error: err.message
      });
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

// Get current time and duration
function getTimeInfo() {
  return {
    currentTime: audioElement.currentTime,
    duration: audioElement.duration
  };
}

// Seek to a specific time
function seekTo(time: number) {
  audioElement.currentTime = time;
}

// Handle messages from the background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Offscreen received message:', message.type);

  switch (message.type) {
    case 'play':
      audioElement.play();
      break;

    case 'pause':
      audioElement.pause();
      break;

    case 'stop':
      audioElement.pause();
      audioElement.currentTime = 0;
      chrome.runtime.sendMessage({ type: 'playerStateUpdate', state: 'stopped' });
      break;

    case 'seek':
      seekTo(message.time);
      break;

    case 'getTimeInfo':
      sendResponse({ timeInfo: getTimeInfo() });
      return true;

    case 'startStreaming':
      processAndReadText(message.text, message.settings);
      break;

    case 'getPlayerState':
      sendResponse({ state: currentPlayerState });
      return true;

    default:
      break;
  }
});

// Initialize audio event handlers
audioElement.onplay = () => {
  currentPlayerState = 'playing';
  chrome.runtime.sendMessage({ type: 'playerStateUpdate', state: 'playing' });
};

audioElement.onpause = () => {
  currentPlayerState = 'paused';
  chrome.runtime.sendMessage({ type: 'playerStateUpdate', state: 'paused' });
};

audioElement.onended = () => {
  currentPlayerState = 'stopped';
  chrome.runtime.sendMessage({ type: 'playerStateUpdate', state: 'stopped' });
};
