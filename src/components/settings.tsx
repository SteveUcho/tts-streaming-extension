import { updateStatus } from "@/utils/dom";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "@/popup/constants";

export function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    chrome.storage.local.get({
      serverUrl: DEFAULT_SETTINGS.serverUrl,
      voice: DEFAULT_SETTINGS.voice,
      speed: DEFAULT_SETTINGS.speed,
      recordAudio: DEFAULT_SETTINGS.recordAudio,
      preprocessText: DEFAULT_SETTINGS.preprocessText
    }).then((result) => {
      setSettings(result as any);
    });
  }, []);

  const saveSettings = async () => {
    const form = document.getElementById('settings-form') as HTMLFormElement;
    const formdata = new FormData(form);
    const data: Record<string, string | number | boolean> = {};
    for (const [key, value] of formdata.entries()) {
      if (key === 'speed') {
        data[key] = Number.parseFloat(value as string);
      } else if (key === 'recordAudio' || key === 'preprocessText') {
        data[key] = value === 'on';
      } else {
        data[key] = value as string;
      }
    }
    if (!formdata.has('recordAudio')) {
      data.recordAudio = false;
    }
    if (!formdata.has('preprocessText')) {
      data.preprocessText = false;
    }

    setSettings(data as any);
    await chrome.storage.local.set(data);
    updateStatus('Settings saved!', false);
  }

  return (
    <form id="settings-form" className="settings-panel">
      <div className="setting-group">
        <label htmlFor="voice">Voice</label>
        <select name="voice" value={settings.voice} onChange={saveSettings}>
          <option value="am_adam">Adam (Alloy)</option>
          <option value="af_nicole">Nicole (Ash)</option>
          <option value="bf_emma">Emma (Coral)</option>
          <option value="af_bella">Bella (Echo)</option>
          <option value="af_sarah">Sarah (Fable)</option>
          <option value="bm_george">George (Onyx)</option>
          <option value="bf_isabella">Isabella (Nova)</option>
          <option value="am_michael">Michael (Sage)</option>
          <option value="af_sky">Sky (Shimmer)</option>
        </select>
      </div>

      <div className="setting-group">
        <label htmlFor="speed">Speed</label>
        <div className="slider-container">
          <input type="range" name="speed" className="slider"
            min="0.25" max="4.0" step="0.25" value={settings.speed.toString()} onChange={saveSettings} />
          <span className="speed-value">{`${settings.speed}x`}</span>
        </div>
      </div>

      <div className="setting-group checkbox-group">
        <label className="checkbox-label">
          <input type="checkbox" name="recordAudio" checked={settings.recordAudio} onChange={saveSettings} /> Save audio for download
        </label>
        <div className="helper-text">Audio will be available to download after playback completes or when stopped.</div>
      </div>

      <div className="setting-group checkbox-group">
        <label className="checkbox-label">
          <input type="checkbox" name="preprocessText" checked={settings.preprocessText} onChange={saveSettings} /> Pre-process text for TTS
        </label>
        <div className="helper-text">Removes markdown, cleans up URLs, and improves text for better speech output.</div>
      </div>

      <div className="setting-group">
        <label htmlFor="serverUrl">Server URL</label>
        <input type="text" name="serverUrl" value={settings.serverUrl} onChange={saveSettings} />
      </div>
    </form>
  )
}