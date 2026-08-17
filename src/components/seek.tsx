import { formatTime } from "@/utils/formatTime";
import { useEffect, useState } from "react";
import { audioPlayer as audioPlayerInstance } from "@/popup/audioPlayer";
import { playStateAtom } from "@/utils/atoms";
import { useAtomValue } from "jotai";

function isDisabled(state: string): boolean {
  switch (state) {
    case 'loading':
      return true;
    case 'playing':
      return false;
    case 'paused':
      return false;
    case 'stopped':
      return true;
    default:
      return true;
  }
}

export function Seek() {
  const playState = useAtomValue(playStateAtom);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [streamMode, setStreamMode] = useState(false);

  const isSeekDisabled = isDisabled(playState);

  useEffect(() => {
    chrome.storage.local.get('streamMode').then((result) => {
      setStreamMode(result.streamMode as boolean ?? false);
    });
    
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.streamMode) {
        setStreamMode(changes.streamMode.newValue as boolean);
      }
    });
    
    return () => {
      chrome.storage.onChanged.removeListener(() => {});
    };
  }, []);

  useEffect(() => {
    if (playState === 'stopped') {
      // Reset seek bar to beginning
      setCurrentTime(0);
      setDuration(0);
    }
  }, [playState]);

  useEffect(() => {
    updateTimeInfo();
    if (playState !== 'playing' || isSeeking) return;
    const interval = setInterval(updateTimeInfo, 200);
    return () => clearInterval(interval);
  }, [isSeeking, playState]);

  const updateTimeInfo = async () => {
    const audioPlayer = audioPlayerInstance;
    const timeInfo = await audioPlayer.getTimeInfo();
    if (timeInfo) {
      setDuration(timeInfo.duration);
      setCurrentTime(timeInfo.currentTime);
    }
  };

  // When user starts seeking
  const handleMouseDown = () => {
    setIsSeeking(true);
  };

  // When user is seeking
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number.parseFloat(e.currentTarget.value));
  };

  // When user finishes seeking
  const handleMouseUp = async () => {
    const newTime = currentTime;
    const audioPlayer = audioPlayerInstance;
    audioPlayer.seek(newTime);
    setIsSeeking(false);
  };

  if (streamMode) {
    return (
      <div className="section-container" style={{ textAlign: "center" }}>
        Streaming Mode: On
      </div>
    );
  }

  return (
    <div className="section-container">
      <div className="seek-bar-wrapper">
        <input type="range" id="seekBar" min="0" step="0.1"
          disabled={isSeekDisabled}
          value={currentTime}
          max={duration}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onChange={handleChange}
        />
      </div>
      <div className="time-display">
        <span id="currentTime">{formatTime(currentTime)}</span>
        <span id="duration">{formatTime(duration)}</span>
      </div>
    </div>
  )
}