import { formatTime } from "@/utils/formatTime";
import { useEffect, useState } from "react";
import { audioPlayer as audioPlayerInstance } from "@/popup/audioPlayer";
import { playStateAtom } from "@/utils/atoms";
import { useAtomValue } from "jotai";

function isDisabled(state: string): boolean {
  switch (state) {
    case 'loading':
      return true;
    case 'ready':
      return false;
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

  const isSeekDisabled = isDisabled(playState);

  useEffect(() => {
    if (playState === 'stopped') {
      // Reset seek bar to beginning
      setCurrentTime(0);
      setDuration(0);
    }
  }, [playState]);

  useEffect(() => {
    if (playState !== 'playing') return;
    const interval = setInterval(async () => {
      const audioPlayer = audioPlayerInstance;
      if (!audioPlayer) return;

      const timeInfo = await audioPlayer.getTimeInfo();
      if (timeInfo && !isSeeking) {
        setDuration(timeInfo.duration);
        setCurrentTime(timeInfo.currentTime);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isSeeking, playState]);

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
    await globalThis.audioPlayer?.seek(newTime);
    setIsSeeking(false);
  };

  return (
    <div className="seek-container">
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