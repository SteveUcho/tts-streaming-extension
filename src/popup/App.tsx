import './App.css'
import { Controls } from '../components/controls'
import { Seek } from '../components/seek'
import { Settings } from '../components/settings'
import { useEffect } from 'react'
import { audioPlayer } from './audioPlayer'
import { useSetAtom } from 'jotai'
import { playStateAtom } from '@/utils/atoms'
import { updateStatus } from '@/utils/dom'

export default function App() {
  const setPlayState = useSetAtom(playStateAtom)

  const handleBackgroundMessage = (message: any) => {
    switch (message.type) {
      case 'playerStateUpdate':
        setPlayState(message.state);
        break;

      case 'recordingComplete':
        audioPlayer.audioUrl = message.audioUrl;
        break;

      case 'streamError':
        updateStatus(message.error, true);
        setPlayState('stopped');
        break;

      // case 'timeUpdate':
      //   if (message.timeInfo && !seekBar.classList.contains('seeking')) {
      //     seekBar.max = message.timeInfo.duration;
      //     seekBar.value = message.timeInfo.currentTime;
      //     document.getElementById('currentTime').textContent = formatTime(message.timeInfo.currentTime);
      //     document.getElementById('duration').textContent = formatTime(message.timeInfo.duration);
      //   }
      //   break;
    }
  }

  useEffect(() => {
    audioPlayer.getState().then(state => {
      setPlayState(state);
    });
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleBackgroundMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleBackgroundMessage);
    };
  }, []);

  return (
    <div>
      <Controls />
      <Seek />
      <Settings />
      <div id="status"></div>
    </div>
  )
}
