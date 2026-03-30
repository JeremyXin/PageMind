import { useState } from 'react';
import type { SummaryResult, ErrorResponse, ExtractedContent } from '~/utils/types';
import { sendToBackground, sendToContentScript } from '~/messaging/sender';
import SummaryView from './components/SummaryView';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';

type AppState = 'idle' | 'extracting' | 'summarizing' | 'done' | 'error';

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<ErrorResponse | null>(null);

  const handleSummarize = async () => {
    try {
      setState('extracting');
      setError(null);

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error('NO_TAB');
      }

      const extractResponse = await sendToContentScript<ExtractedContent>(tab.id, {
        type: 'EXTRACT_CONTENT',
      });

      if (!extractResponse.success || !extractResponse.data) {
        setError(extractResponse.error || { code: 'CONTENT_EXTRACTION_FAILED', message: 'Failed to extract content' });
        setState('error');
        return;
      }

      setState('summarizing');

      const summaryResponse = await sendToBackground<SummaryResult>({
        type: 'SUMMARIZE',
        payload: extractResponse.data,
      });

      if (!summaryResponse.success || !summaryResponse.data) {
        setError(summaryResponse.error || { code: 'AI_ERROR', message: 'Failed to generate summary' });
        setState('error');
        return;
      }

      setSummaryResult(summaryResponse.data);
      setState('done');
    } catch (err) {
      console.error('Summarize error:', err);
      setError({
        code: 'UNKNOWN',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      });
      setState('error');
    }
  };

  const handleRetry = () => {
    setState('idle');
    setError(null);
    setSummaryResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">网页摘要</h1>
      </header>

      <main className="flex-1 overflow-y-auto">
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
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                总结本页
              </button>
            </div>
          </div>
        )}

        {(state === 'extracting' || state === 'summarizing') && (
          <LoadingState />
        )}

        {state === 'error' && error && (
          <ErrorState error={error} onRetry={handleRetry} />
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
    </div>
  );
}
