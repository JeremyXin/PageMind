import type { ErrorResponse } from '~/utils/types';

interface ErrorStateProps {
  error: ErrorResponse;
  onRetry: () => void;
}

const ERROR_MESSAGES: Record<string, { title: string; message: string; showSettings?: boolean }> = {
  NO_API_KEY: {
    title: '未配置 API Key',
    message: '请先在设置页面配置您的 OpenAI API Key，才能使用摘要功能。',
    showSettings: true,
  },
  INVALID_API_KEY: {
    title: 'API Key 无效',
    message: '您配置的 API Key 无效或已过期，请检查设置页面的配置。',
    showSettings: true,
  },
  RATE_LIMIT: {
    title: '请求频率超限',
    message: 'API 请求频率超过限制，请稍后再试。如果问题持续，请检查您的 API 配额。',
  },
  NETWORK_ERROR: {
    title: '网络连接失败',
    message: '无法连接到 API 服务器，请检查您的网络连接或 Base URL 配置。',
    showSettings: true,
  },
  CONTENT_EXTRACTION_FAILED: {
    title: '内容提取失败',
    message: '无法从当前页面提取内容。该页面可能使用了特殊的加载方式，或内容为空。',
  },
  AI_ERROR: {
    title: 'AI 处理失败',
    message: '摘要生成过程中出现错误，请重试。如果问题持续，可能是 API 服务异常。',
  },
  UNKNOWN: {
    title: '未知错误',
    message: '发生了未知错误，请重试或联系支持。',
  },
};

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  const errorInfo = ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN;

  const handleOpenSettings = () => {
    browser.runtime.openOptionsPage();
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">{errorInfo.title}</h3>
      <p className="text-sm text-gray-600 text-center mb-1">{errorInfo.message}</p>
      
      {error.message && (
        <p className="text-xs text-gray-500 text-center mt-2 px-4 py-2 bg-gray-50 rounded border border-gray-200 max-w-full break-words">
          {error.message}
        </p>
      )}

      <div className="flex flex-col gap-2 w-full max-w-xs mt-6">
        <button
          onClick={onRetry}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          重试
        </button>
        
        {errorInfo.showSettings && (
          <button
            onClick={handleOpenSettings}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            打开设置
          </button>
        )}
      </div>
    </div>
  );
}
