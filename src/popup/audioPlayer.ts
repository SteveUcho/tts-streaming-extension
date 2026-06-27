import { TextProcessor } from "@/textProcessor";
import { DEFAULT_SETTINGS } from "./constants";
import { getHighlightText } from "@/utils/getHighlightText";

// Process text based on settings
function processText(text: string, settings: any) {
  if (settings.preprocessText) {
    return TextProcessor.process(text);
  }
  return text;
}

export class AudioPlayer {
  private isInitialized: boolean = false;
  audioUrl: string | null = null;

  async init() {
    if (!this.isInitialized) {
      // Set up the offscreen document for background playback
      await chrome.runtime.sendMessage({ type: 'setupOffscreen' });
      this.isInitialized = true;
    }
  }

  async play(): Promise<string> {
    await this.init();

    try {
      const state = await this.getState();

      if (state === 'paused' || state === 'ready') {
        this.resume();
        return "playing";
      }
      this.audioUrl = null;
      let text = await getHighlightText();
      const settings = await chrome.storage.local.get({
        serverUrl: DEFAULT_SETTINGS.serverUrl,
        voice: DEFAULT_SETTINGS.voice,
        speed: DEFAULT_SETTINGS.speed,
        recordAudio: DEFAULT_SETTINGS.recordAudio,
        preprocessText: DEFAULT_SETTINGS.preprocessText
      });

      // Process text if enabled
      text = processText(text, settings);
      // Start streaming audio
      await chrome.runtime.sendMessage({
        type: 'startStreaming',
        text: text,
        settings: settings,
        record: settings.recordAudio
      });

      return "loading";
    } catch (error) {
      console.error('Error playing audio:', error);
      return "stopped";
    }
  }

  pause() {
    if (this.isInitialized) {
      chrome.runtime.sendMessage({ type: 'pause' });
    }
  }

  resume() {
    if (this.isInitialized) {
      chrome.runtime.sendMessage({ type: 'play' });
    }
  }

  stop() {
    if (this.isInitialized) {
      chrome.runtime.sendMessage({ type: 'stop' });
    }
  }

  async seek(time: number) {
    if (this.isInitialized) {
      chrome.runtime.sendMessage({ type: 'seek', time: time });
    }
  }

  async getState(): Promise<string> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'getPlayerState' }, (response) => {
        resolve(response?.state || 'stopped');
      });
    });
  }

  async getTimeInfo(): Promise<{ currentTime: number; duration: number } | null> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'getTimeInfo' }, (response) => {
        resolve(response?.timeInfo || null);
      });
    });
  }
}

export const audioPlayer = new AudioPlayer();