let audioContext: AudioContext | null = null;

let audioSource: MediaElementAudioSourceNode | null = null;
let hasSourceConnected = false;

// Initialize the audio context
function initAudio() {
  audioContext = audioContext || new (globalThis.AudioContext || (globalThis as any).webkitAudioContext)();
  const audioElement = document.getElementById('audioElement') as HTMLAudioElement;
  // Set up event listeners
  audioElement.onplay = () => {
    if (!audioContext || !audioElement) return;

    // Connect to audio context only once
    if (!hasSourceConnected) {
      try {
        // Disconnect previous source if it exists
        if (audioSource) {
          try {
            audioSource.disconnect();
          } catch (e) {
            // Ignore errors if already disconnected
          }
        }

        // Create and connect new source
        audioSource = audioContext.createMediaElementSource(audioElement);
        audioSource.connect(audioContext.destination);
        hasSourceConnected = true;
      } catch (e) {
        console.error('Error connecting audio source:', e);
      }
    }

    chrome.runtime.sendMessage({ type: 'stateUpdate', state: 'playing' });
  };

  audioElement.onpause = () => {
    chrome.runtime.sendMessage({ type: 'stateUpdate', state: 'paused' });
  };

  audioElement.onended = () => {
    chrome.runtime.sendMessage({ type: 'stateUpdate', state: 'stopped' });
    chrome.runtime.sendMessage({ type: 'streamComplete' });
  };

  // Add timeupdate event for seeking
  // audioElement.ontimeupdate = () => {
  //   chrome.runtime.sendMessage({ 
  //     type: 'timeUpdate', 
  //     timeInfo: {
  //       currentTime: audioElement?.currentTime ?? 0,
  //       duration: audioElement?.duration ?? 0
  //     }
  //   });
  // };
}

// Process audio data received from background script
function processAudioData(audioDataArray: number[], mimeType: string, isRecording: boolean) {
  try {
    initAudio();

    // Convert array back to Uint8Array
    const uint8Array = new Uint8Array(audioDataArray);

    // Create blob from the array
    const blob = new Blob([uint8Array], { type: mimeType });

    // Create URL for the blob
    const audioUrl = URL.createObjectURL(blob);

    // If recording is enabled, send URL back for download
    if (isRecording) {
      chrome.runtime.sendMessage({
        type: 'recordingComplete',
        audioUrl: audioUrl
      });
    }

    // Play the audio
    playAudioUrl(audioUrl);

    // Notify that audio is ready to play
    chrome.runtime.sendMessage({ type: 'audioReady' });
  } catch (error) {
    console.error('Error processing audio data:', error);
    chrome.runtime.sendMessage({
      type: 'streamError',
      error: (error as Error).message
    });
  }
}

// Play audio from URL
function playAudioUrl(audioUrl: string) {
  const audioElement = document.getElementById('audioElement') as HTMLAudioElement;
  if (!audioContext) {
    console.error('Audio element or context not found');
    return;
  }
  try {
    console.log('Playing audio URL:', audioUrl);

    // Reset connection flag
    hasSourceConnected = false;

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
    console.error('Error playing audio URL:', error);
    chrome.runtime.sendMessage({
      type: 'streamError',
      error: (error as Error).message
    });
  }
}

// Get current time and duration
function getTimeInfo() {
  const audioElement = document.getElementById('audioElement') as HTMLAudioElement;
  return {
    currentTime: audioElement.currentTime,
    duration: audioElement.duration
  };
}

// Seek to a specific time
function seekTo(time: number) {
  const audioElement = document.getElementById('audioElement') as HTMLAudioElement;
  audioElement.currentTime = time;
  return true;
}

// Handle messages from the background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Offscreen received message:', message.type);
  const audioElement = document.getElementById('audioElement') as HTMLAudioElement;

  switch (message.type) {
    case 'processAudioData':
      if (message.audioData) {
        processAudioData(message.audioData, message.mimeType, message.isRecording);
      }
      break;

    case 'play':
      audioElement.play();
      break;

    case 'pause':
      audioElement.pause();
      break;

    case 'stop':
      audioElement.pause();
      audioElement.currentTime = 0;
      chrome.runtime.sendMessage({ type: 'stateUpdate', state: 'stopped' });
      break;

    case 'seek': {
      const success = seekTo(message.time);
      sendResponse({ success });
      return true;
    }
    case 'getTimeInfo':
      sendResponse({ timeInfo: getTimeInfo() });
      return true;
  }
});

// Initialize when the document loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Offscreen document loaded');

  // Initialize audio context
  initAudio();

  console.log('Offscreen document initialized');
});