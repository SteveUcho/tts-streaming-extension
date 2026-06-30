import { updateStatus } from "@/utils/dom";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "@/constants";
import { useSetAtom } from "jotai";
import { streamModeAtom } from "@/utils/atoms";

export function Settings() {
  const setStreamMode = useSetAtom(streamModeAtom);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    chrome.storage.local.get(DEFAULT_SETTINGS as any).then((result) => {
      setSettings(result as any);
      setStreamMode(result.streamMode as boolean ?? false);
    });
  }, []);

  const saveSettings = async () => {
    const form = document.getElementById('settings-form') as HTMLFormElement;
    const formdata = new FormData(form);
    const data: Record<string, string | number | boolean> = {};
    for (const [key, value] of formdata.entries()) {
      if (key === 'speed') {
        data[key] = Number.parseFloat(value as string);
      } else if (key === 'recordAudio' || key === 'preprocessText' || key === 'streamMode') {
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
    if (!formdata.has('streamMode')) {
      data.streamMode = false;
    }

    if (data.streamMode) {
      setStreamMode(true);
    } else {
      setStreamMode(false);
    }
    
    setSettings(data as any);
    await chrome.storage.local.set(data);
    updateStatus('Settings saved!', false);
  }

  return (
    <form id="settings-form" className="section-container">
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

      <div className="setting-group">
        <div className="checkbox-group">
          <label htmlFor="recordAudio" className="checkbox-label">
            Save audio for download
          </label>
          <input id="recordAudio" type="checkbox" name="recordAudio" checked={settings.recordAudio} onChange={saveSettings} />
        </div>
        <div className="helper-text">Audio will be available to download after playback completes or when stopped.</div>
      </div>

      <div className="setting-group ">
        <div className="checkbox-group">
          <label htmlFor="preprocessText" className="checkbox-label">
            Pre-process text for TTS
          </label>
          <input id="preprocessText" type="checkbox" name="preprocessText" checked={settings.preprocessText} onChange={saveSettings} />
        </div>
        <div className="helper-text">Removes markdown, cleans up URLs, and improves text for better speech output.</div>
      </div>

      <div className="setting-group ">
        <div className="checkbox-group">
          <label htmlFor="streamMode" className="checkbox-label">
            Stream Audio
          </label>
          <input id="streamMode" type="checkbox" name="streamMode" checked={settings.streamMode} onChange={saveSettings} />
        </div>
        <div className="helper-text">Streams audio directly from the server instead of downloading the entire file first. Seek will be disabled.</div>
      </div>

      <div className="setting-group">
        <label htmlFor="serverUrl">Server URL</label>
        <input type="text" name="serverUrl" value={settings.serverUrl} onChange={saveSettings} />
      </div>
    </form>
  )
}