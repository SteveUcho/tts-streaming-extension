export interface LocalSettings {
  serverUrl: string;
  voice: string;
  speed: number;
  recordAudio: boolean;
  preprocessText: boolean;
}

export const DEFAULT_SETTINGS: LocalSettings = {
  serverUrl: 'http://localhost:8000/v1/audio/speech',
  voice: 'af_bella',
  speed: 1.0,
  recordAudio: false,
  preprocessText: true
};
