import type { ErrorResponse } from './types';

export interface ErrorMessageInfo {
  title: string;
  message: string;
  showSettings?: boolean;
}

export const ERROR_MESSAGES: Record<string, ErrorMessageInfo> = {
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
    message: '请求过于频繁，请稍后重试。如果问题持续，请检查您的 API 配额。',
  },
  TIMEOUT: {
    title: '请求超时',
    message: '请求超时（30秒），请重试。如果问题持续，可能是网络较慢或 API 服务繁忙。',
  },
  NETWORK_ERROR: {
    title: '网络连接失败',
    message: '无法连接到 API 服务器，请检查您的网络连接或 Base URL 配置。',
    showSettings: true,
  },
  SERVER_ERROR: {
    title: 'API 服务器错误',
    message: 'API 服务器出现错误，请稍后重试。',
  },
  INVALID_RESPONSE_FORMAT: {
    title: 'AI 返回格式异常',
    message: 'AI 返回的数据格式异常，请重试。如果问题持续，可能是模型配置问题。',
  },
  UNSUPPORTED_PAGE: {
    title: '页面类型不支持',
    message: '该页面类型不支持摘要（浏览器内部页面如 chrome://、about: 等）。',
  },
  PAGE_LOADING: {
    title: '页面仍在加载',
    message: '页面仍在加载中，请稍后重试。',
  },
  NO_ARTICLE_CONTENT: {
    title: '无法提取内容',
    message: '无法提取文章内容，该页面可能不是文章类型或内容为空。',
  },
  CONTENT_TOO_SHORT: {
    title: '内容过短',
    message: '页面内容过短，无法生成有意义的摘要。',
  },
  CONTENT_EXTRACTION_FAILED: {
    title: '内容提取失败',
    message: '无法从当前页面提取内容。该页面可能使用了特殊的加载方式。',
  },
  AI_ERROR: {
    title: 'AI 处理失败',
    message: '摘要生成过程中出现错误，请重试。如果问题持续，可能是 API 服务异常。',
  },
  API_ERROR: {
    title: 'API 请求失败',
    message: 'API 请求失败，请稍后重试。',
  },
  UNKNOWN: {
    title: '未知错误',
    message: '发生了未知错误，请重试或联系支持。',
  },
};

/**
 * Get error message info for a given error code.
 * Returns UNKNOWN error info if code is not found.
 */
export function getErrorMessage(code: string): ErrorMessageInfo {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN;
}

/**
 * Get error message info from an ErrorResponse object.
 * Returns UNKNOWN error info if error is null/undefined.
 */
export function getErrorMessageFromResponse(error: ErrorResponse | null | undefined): ErrorMessageInfo {
  if (!error) {
    return ERROR_MESSAGES.UNKNOWN;
  }
  return getErrorMessage(error.code);
}
