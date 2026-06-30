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
    console.log('Received message from background:', message);
    switch (message.type) {
      case 'playerStateUpdate':
        setPlayState(message.state);
        break;

      case 'recordingComplete': {
        const audioChunk = message.audioChunks.map((chunk: number[]) => Uint8Array.from(chunk).buffer);
        const audioBlob = new Blob(audioChunk, { type: 'audio/mpeg' });
        audioPlayer.audioUrl = URL.createObjectURL(audioBlob);
        break;
      }

      case 'streamError':
        updateStatus(message.error, true);
        setPlayState('stopped');
        break;
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
