import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '~/utils/storage';
import type { ExtensionSettings, TestConnectionResult } from '~/utils/types';

const PROVIDER_PRESETS: { pattern: RegExp; model: string; label: string }[] = [
  { pattern: /deepseek\.com/, model: 'deepseek-chat', label: 'DeepSeek: deepseek-chat' },
  { pattern: /anthropic\.com/, model: 'claude-3-5-sonnet-20241022', label: 'Anthropic: claude-3-5-sonnet-20241022' },
  { pattern: /generativelanguage\.googleapis\.com/, model: 'gemini-1.5-pro', label: 'Gemini: gemini-1.5-pro' },
  { pattern: /api\.openai\.com/, model: 'gpt-4o-mini', label: 'OpenAI: gpt-4o-mini' },
];

function getSuggestedModel(baseUrl: string): string | null {
  const match = PROVIDER_PRESETS.find((p) => p.pattern.test(baseUrl));
  return match ? match.model : null;
}

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<ExtensionSettings>({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const suggestedModel = getSuggestedModel(settings.baseUrl);
  const showModelHint = suggestedModel !== null && settings.model !== suggestedModel;

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await saveSettings(settings);
      setMessage({ type: 'success', text: '保存成功！' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: `保存失败：${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setMessage(null);
    try {
      const response = await browser.runtime.sendMessage({
        type: 'TEST_CONNECTION',
        payload: {
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          model: settings.model,
        },
      }) as { success: boolean; data?: TestConnectionResult };

      const result = response?.data;
      if (result?.success) {
        setMessage({ type: 'success', text: '连接成功！API Key 有效。' });
      } else {
        const errorMessages: Record<string, string> = {
          INVALID_API_KEY: 'API Key 无效或未授权，请检查后重试',
          WRONG_URL: 'Base URL 无法访问，请确认地址是否正确',
          NETWORK_ERROR: result?.message ?? '网络连接失败，请检查 Base URL',
          SERVER_ERROR: 'API 服务器错误，请稍后重试',
          UNKNOWN: result?.message ?? '连接失败，请检查配置',
        };
        const code = result?.errorCode ?? 'UNKNOWN';
        setMessage({ type: 'error', text: errorMessages[code] ?? result?.message ?? '连接失败' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `连接失败：${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-sm mx-4 bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">设置</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="关闭设置"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-4">
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <label htmlFor="modal-apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <div className="relative">
              <input
                id="modal-apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-16"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
              >
                {showApiKey ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="modal-baseUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Base URL
            </label>
            <input
              id="modal-baseUrl"
              type="text"
              value={settings.baseUrl}
              onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="modal-model" className="block text-sm font-medium text-gray-700 mb-1">
              模型
            </label>
            <input
              id="modal-model"
              type="text"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              placeholder="gpt-4o-mini"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {showModelHint ? (
              <p className="mt-1 text-xs text-amber-600">
                检测到该服务商，推荐模型 ID：
                <button
                  type="button"
                  className="font-mono font-medium underline ml-1"
                  onClick={() => setSettings({ ...settings, model: suggestedModel! })}
                >
                  {suggestedModel}
                </button>
                （点击自动填入）
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">填写 API 文档中的模型 ID，如 gpt-4o-mini、deepseek-chat</p>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !settings.apiKey}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {isTesting ? '测试中...' : '测试连接'}
          </button>
        </div>

        <div className="px-4 pb-3 shrink-0">
          <p className="text-xs text-gray-500">
            API Key 仅存储在本地浏览器中，不会上传到任何服务器。
          </p>
        </div>
      </div>
    </div>
  );
}
