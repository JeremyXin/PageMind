export interface WebSearchCapability {
  supported: boolean;
  toolType: string | null;
}

export const SUPPORTED_PROVIDERS: Record<string, string> = {
  'api.openai.com': 'web_search_preview',
  'api.x.ai': 'web_search',
  'dashscope.aliyuncs.com': 'web_search',
  'dashscope-intl.aliyuncs.com': 'web_search',
  'dashscope-us.aliyuncs.com': 'web_search',
  'api.perplexity.ai': 'web_search',
};

const OPENAI_SEARCH_MODELS = /^(gpt-4|gpt-5|o[1-4]|chatgpt-4o)/i;

export function getWebSearchCapability(baseUrl: string, model: string): WebSearchCapability {
  const url = baseUrl.toLowerCase();

  if (url.includes('api.openai.com')) {
    const supported = OPENAI_SEARCH_MODELS.test(model);
    return { supported, toolType: supported ? 'web_search_preview' : null };
  }

  if (url.includes('api.perplexity.ai')) {
    const supported = model.toLowerCase().includes('sonar');
    return { supported, toolType: supported ? 'web_search' : null };
  }

  for (const [domain, toolType] of Object.entries(SUPPORTED_PROVIDERS)) {
    if (domain !== 'api.openai.com' && domain !== 'api.perplexity.ai' && url.includes(domain)) {
      return { supported: true, toolType };
    }
  }

  return { supported: false, toolType: null };
}
