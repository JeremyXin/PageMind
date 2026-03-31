import { useState } from 'react';
import type { SummaryResult, ErrorResponse } from '~/utils/types';
import { sendToBackground } from '~/messaging/sender';
import SummaryView from './components/SummaryView';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import SettingsModal from './components/SettingsModal';
import ChatPanel from './components/ChatPanel';

type AppState = 'idle' | 'loading' | 'done' | 'error';

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('');

  const handleSummarize = async () => {
    if (state === 'loading') return;

    setState('loading');
    setError(null);

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url) {
        setCurrentTabUrl(tabs[0].url);
      }

      const response = await sendToBackground<SummaryResult>({
        type: 'EXTRACT_AND_SUMMARIZE',
      });

      if (!response.success || !response.data) {
        setError(response.error || { code: 'UNKNOWN', message: '未知错误' });
        setState('error');
        return;
      }

      setSummaryResult(response.data);
      setState('done');
    } catch (err) {
      setError({
        code: 'UNKNOWN',
        message: err instanceof Error ? err.message : '未知错误',
      });
      setState('error');
    }
  };

  const handleRetry = () => {
    setState('idle');
    setError(null);
    setSummaryResult(null);
  };

  const summaryContext = state === 'done' && summaryResult !== null && currentTabUrl
    ? { url: currentTabUrl, summary: summaryResult }
    : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">网页摘要</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="打开设置"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto min-h-0">
        {state === 'idle' && (
          <div className="p-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm mb-4">点击下方按钮，使用 AI 为当前页面生成结构化摘要</p>
              <button
                onClick={handleSummarize}
                disabled={state === 'loading'}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300"
              >
                总结本页
              </button>
            </div>
          </div>
        )}

        {state === 'loading' && <LoadingState />}

        {state === 'error' && error && (
          <ErrorState error={error} onRetry={handleRetry} onOpenSettings={() => setShowSettings(true)} />
        )}

        {state === 'done' && summaryResult && (
          <div className="p-4">
            <SummaryView result={summaryResult} />
            <button
              onClick={handleRetry}
              className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              重新总结
            </button>
          </div>
        )}
      </main>

      <div className="border-t border-gray-200 flex flex-col" style={{ height: '45%' }}>
        <ChatPanel summaryContext={summaryContext} disabled={state === 'loading'} />
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
