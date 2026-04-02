import { useState } from 'react';
import ChatPanel from './components/ChatPanel';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  return (
    <>
      <ChatPanel onOpenSettings={() => setShowSettings(true)} />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
