import { useAtom } from "jotai";
import { playStateAtom } from "@/utils/atoms";
import { updateStatus } from "@/utils/dom";
import { audioPlayer as audioPlayerInstance } from "@/popup/audioPlayer";
import { useEffect, useState } from "react";
import { getHighlightText } from "@/utils/getHighlightText";


interface ControlsState {
  playDisabled: boolean;
  pauseDisabled: boolean;
  stopDisabled: boolean;
  downloadDisabled: boolean;
  loading: boolean;
}

function updateControlButtons(state: string, currentAudioUrl: string | null, hasHighlight: boolean): ControlsState {
  const controlsState: ControlsState = {
    playDisabled: true,
    pauseDisabled: true,
    stopDisabled: false,
    downloadDisabled: true,
    loading: false,
  };

  // Stop button is always enabled (except during loading)
  controlsState.stopDisabled = state === 'loading';
  // not loading unless loading
  controlsState.loading = false;

  switch (state) {
    case 'loading':
      controlsState.playDisabled = true;
      controlsState.pauseDisabled = true;
      controlsState.downloadDisabled = true;
      controlsState.loading = true;
      break;
    case 'playing':
      controlsState.playDisabled = true;
      controlsState.pauseDisabled = false;
      break;
    case 'paused':
    case 'stopped': {
      controlsState.playDisabled = false;
      controlsState.pauseDisabled = true;
      controlsState.stopDisabled = true;
      controlsState.downloadDisabled = !currentAudioUrl;
      break;
    }
    default:
      controlsState.playDisabled = false;
      controlsState.pauseDisabled = true;
      controlsState.downloadDisabled = true;
  }
  if (!hasHighlight) {
    controlsState.playDisabled = true;
  }
  return controlsState;
}

export function Controls() {
  const [playState, setPlayState] = useAtom(playStateAtom)
  const [controlsState, setControlsState] = useState<ControlsState>({
    playDisabled: true,
    pauseDisabled: true,
    stopDisabled: false,
    downloadDisabled: true,
    loading: false,
  });

  const audioPlayer = audioPlayerInstance;

  useEffect(() => {
    const updateControls = async () => {
      const highlightText = await getHighlightText();
      const hasHighlight = highlightText.length > 0;
      const currentAudioUrl = audioPlayer.audioUrl;
      const newState = updateControlButtons(playState, currentAudioUrl, hasHighlight);
      setControlsState(newState);
    };
    updateControls();
  }, [playState]);

  const handlePlayClick = async () => {
    await audioPlayer.play();
  };

  const handlePauseClick = () => {
    audioPlayer.pause();
    setPlayState('paused');
  }

  const handleStopClick = () => {
    audioPlayer.stop();
    setPlayState('stopped');
  }

  // Download button
  const handleDownloadClick = () => {
    if (audioPlayer.audioUrl) {
      const a = document.createElement('a');
      a.href = audioPlayer.audioUrl;
      a.download = 'speech.mp3';
      document.body.appendChild(a);
      a.click();
      a.remove();
      updateStatus('Audio downloaded', false);
    }
  };

  return (
    <div className="control-panel section-container">
      <button className="btn" id="playBtn" title="Play" disabled={controlsState.playDisabled} onClick={handlePlayClick}>
        <i className="fas fa-play"></i>
      </button>
      <button className="btn" id="pauseBtn" title="Pause" disabled={controlsState.pauseDisabled} onClick={handlePauseClick}>
        <i className="fas fa-pause"></i>
      </button>
      <button className="btn" id="stopBtn" title="Stop" disabled={controlsState.stopDisabled} onClick={handleStopClick}>
        <i className="fas fa-stop"></i>
      </button>
      <button className="btn" id="downloadBtn" title="Download" disabled={controlsState.downloadDisabled} onClick={handleDownloadClick}>
        <i className="fas fa-download"></i>
      </button>

      <div id="loadingIndicator" style={{ display: controlsState.loading ? 'flex' : 'none' }}>
        <div className="spinner"></div>
      </div>
    </div>
  )
}