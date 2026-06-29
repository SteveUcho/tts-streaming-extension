export class AudioPlayer {
  audioUrl: string | null = null;

  async play() {
    try {
      const state = await this.getState();
      console.log('Current state:', state);

      if (state === 'paused') {
        this.resume();
        return;
      }

      this.audioUrl = null;
      console.log('Audio URL cleared');

      // Start streaming audio
      chrome.runtime.sendMessage({
        type: 'startStreamingBackground',
      });
      console.log('Streaming started');

    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  pause() {
    chrome.runtime.sendMessage({ type: 'pause' });
  }

  resume() {
    chrome.runtime.sendMessage({ type: 'play' });
  }

  stop() {
    chrome.runtime.sendMessage({ type: 'stop' });
  }

  seek(time: number) {
    chrome.runtime.sendMessage({ type: 'seek', time: time });
  }

  async getState(): Promise<string> {
    const settings = await chrome.storage.local.get('streamMode');
    const response = await chrome.runtime.sendMessage({ type: 'getPlayerState', streamMode: settings.streamMode });
    console.log('Get state new response:', response);
    return response?.state || 'stopped';
  }

  async getTimeInfo(): Promise<{ currentTime: number; duration: number } | null> {
    const response = await chrome.runtime.sendMessage({ type: 'getTimeInfo' });
    console.log('Get time info new response:', response);
    return response?.timeInfo || null;
  }
}

export const audioPlayer = new AudioPlayer();