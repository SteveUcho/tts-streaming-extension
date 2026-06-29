import { LocalSettings } from "@/constants";

const audioElement = document.getElementById('audioElement') as HTMLAudioElement;
let currentPlayerState = 'stopped';

let audioCtx: AudioContext | null = null;
let nextStartTime = 0; // Tracks when the next chunk should play
let sourceCount = 0;

function onSourceEnd() {
  sourceCount--;
  if (sourceCount === 0) {
    chrome.runtime.sendMessage({ type: 'playerStateUpdate', state: 'stopped' });
  }
}

async function playAudioChunk(audioCtx: AudioContext, arrayBuffer: ArrayBuffer) {
  // 1. Decode the binary chunk into an AudioBuffer
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // 2. Create an AudioBufferSourceNode
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;

    // 3. Connect to the speakers
    source.connect(audioCtx.destination);

    // 4. Schedule playback seamlessly
    const currentTime = audioCtx.currentTime;
    if (nextStartTime < currentTime) {
      nextStartTime = currentTime; // Reset if we fall behind
    }

    source.start(nextStartTime);
    sourceCount++;
    source.onended = onSourceEnd;
    nextStartTime += audioBuffer.duration; // Advance time tracker
  } catch (err) {
    console.error("Error decoding audio chunk", err);
  }
}

// Process and read text with default settings
async function processAndReadText(text: string, settings: LocalSettings) {
  chrome.runtime.sendMessage({ type: 'playerStateUpdate', state: 'loading' });

  try {
    const response = await fetch(settings.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

    // Create URL for the blob
    let audioUrl = "";

    if (settings.streamMode && response.body instanceof ReadableStream) {
      audioCtx?.close();
      audioCtx = new globalThis.AudioContext();
      const reader = response.body.getReader();
      chrome.runtime.sendMessage({ type: 'playerStateUpdate', state: 'playing' });

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Process the chunk
        await playAudioChunk(audioCtx, value.buffer);
      }
    } else {
      // Get the audio data as a blob
      const audioBlob = await response.blob();
      audioUrl = URL.createObjectURL(audioBlob);

      // Set up audio element
      audioElement.src = audioUrl;

      chrome.runtime.sendMessage({ type: 'playerStateUpdate', state: 'playing' });
      // Start playing
      audioElement.play().catch(err => {
        console.error('Play error:', err);
        chrome.runtime.sendMessage({ type: 'streamError', error: err.message });
      });
    }
    // If recording is enabled, send URL back for download
    if (settings.recordAudio) {
      chrome.runtime.sendMessage({ type: 'recordingComplete', audioUrl: audioUrl });
    }
  } catch (error) {
    console.error('Error streaming audio:', error);
    chrome.runtime.sendMessage({ type: 'streamError', error: (error as Error).message });

    // Update state to stopped on error
    currentPlayerState = 'stopped';
    chrome.runtime.sendMessage({ type: 'playerStateUpdate', state: 'stopped' });
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

function getPlayerState(streamMode: boolean): string {
  if (!streamMode) {
    return currentPlayerState;
  }
  switch (audioCtx?.state) {
    case 'suspended':
      return 'paused';
    case 'running':
      return 'playing';
    case 'closed':
      return 'stopped';
    default:
      return 'stopped';
  }
}

// Handle messages from the background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Offscreen received message:', message.type);

  switch (message.type) {
    case 'play':
      currentPlayerState = 'playing';
      audioCtx?.resume();
      audioElement.play();
      chrome.runtime.sendMessage({ type: 'playerStateUpdate', state: 'playing' });
      break;

    case 'pause':
      currentPlayerState = 'paused';
      audioCtx?.suspend();
      audioElement.pause();
      chrome.runtime.sendMessage({ type: 'playerStateUpdate', state: 'paused' });
      break;

    case 'stop':
      currentPlayerState = 'stopped';
      if (audioCtx?.state !== 'closed') {
        audioCtx?.close();
      }
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
      // Set state to loading
      currentPlayerState = 'loading';
      processAndReadText(message.text, message.settings);
      sendResponse(true);
      return true;

    case 'getPlayerState':
      sendResponse({ state: getPlayerState(message.streamMode) });
      return true;

    default:
      break;
  }
});

// Initialize audio event handlers
audioElement.onended = () => {
  chrome.runtime.sendMessage({ type: 'playerStateUpdate', state: 'stopped' });
};
