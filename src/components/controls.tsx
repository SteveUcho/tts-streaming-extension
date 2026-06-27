import { useAtom } from "jotai";
import { playStateAtom } from "@/utils/atoms";
import { DEFAULT_SETTINGS } from "@/popup/constants";
import { updateStatus } from "@/utils/dom";
import { audioPlayer as audioPlayerInstance } from "@/popup/audioPlayer";


interface ControlsState {
  playDisabled: boolean;
  pauseDisabled: boolean;
  stopDisabled: boolean;
  downloadDisabled: boolean;
  loading: boolean;
}

function updateControlButtons(state: string, currentAudioUrl: string | null):ControlsState {
  const controlsState: ControlsState = {
    playDisabled: false,
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
    case 'ready':
    case 'playing':
    case 'paused':
    case 'stopped': {
      controlsState.playDisabled = false;
      controlsState.pauseDisabled = true;
      controlsState.downloadDisabled = !currentAudioUrl;
      break;
    }
    default:
      controlsState.playDisabled = false;
      controlsState.pauseDisabled = true;
      controlsState.downloadDisabled = true;
  }
  return controlsState;
}

export function Controls() {
  const [playState, setPlayState] = useAtom(playStateAtom)

  const audioPlayer = audioPlayerInstance;
  const controlsState = updateControlButtons(playState, audioPlayer.audioUrl);

  const handlePlayClick = async () => {
    setPlayState('loading');
    const newState = await audioPlayer.play();
    setPlayState(newState);
    if (newState === 'stopped') {
      updateStatus('Error playing audio', true);
    }
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
    <div className="control-panel">
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