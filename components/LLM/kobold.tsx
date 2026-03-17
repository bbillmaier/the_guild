import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Text } from 'react-native';

import { API_BASE_URL_KEY, getSetting } from '@/lib/settings';
import { enqueueJob } from '@/lib/llm-queue';

export const defaultKoboldApiBase = 'http://localhost:5001';
// Tried in order. Chat-completions endpoints are tried first because most
// modern local models are chat models that stop immediately on raw prompts.
// Each path is tried with both plain base and /api-prefixed base so the user
// can paste either https://host or https://host/api as their API URL.
const koboldApiEndpoints = [
  '/v1/chat/completions',     // OpenAI chat — base already includes /api
  '/api/v1/chat/completions', // OpenAI chat — plain base
  '/v1/completions',          // OpenAI text — base already includes /api
  '/api/v1/completions',      // OpenAI text — plain base
  '/api/v1/generate',         // KoboldCpp native — plain base
  '/v1/generate',             // KoboldCpp native — base already includes /api
  '/api',                     // last-resort fallback
];

export type KoboldState = {
  loading: boolean;
  response: string;
  error: string | null;
};

export type KoboldProps = {
  prompt: string;
  auto?: boolean;
  onResponse?: (response: string) => void;
  onError?: (error: string) => void;
  render?: (state: KoboldState) => ReactNode;
};

function trimToLastSentence(text: string): string {
  const match = text.match(/^.*[.!?]/s);
  return match ? match[0].trim() : text.trim();
}

export function callKoboldApi(prompt: string, maxTokens = 220, label?: string): Promise<string> {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) return Promise.resolve('');
  return enqueueJob(() => _callKoboldApi(trimmedPrompt, maxTokens), label);
}

async function _callKoboldApi(trimmedPrompt: string, maxTokens: number): Promise<string> {

  const savedBase = await getSetting(API_BASE_URL_KEY);
  const koboldApiBase = savedBase?.trim() || defaultKoboldApiBase;
  let lastError = 'Kobold API request failed.';

  for (const endpoint of koboldApiEndpoints) {
    const response = await fetch(`${koboldApiBase}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildRequestBody(endpoint, trimmedPrompt, maxTokens)),
    });

    if (response.status === 404) {
      lastError = `Endpoint not found: ${endpoint}`;
      continue;
    }

    if (!response.ok) {
      throw new Error(`Kobold API request failed with status ${response.status} on ${endpoint}.`);
    }

    const raw = await response.text();
    if (!raw.trim()) {
      throw new Error(`Kobold API returned an empty response body on ${endpoint}.`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = JSON.parse(raw) as unknown;
      const text = extractResponseText(data).trim();
      if (!text) {
        lastError = `Kobold API JSON response did not contain text on ${endpoint}.`;
        console.warn(
          `[Kobold] Empty text on ${endpoint}, trying next endpoint.\n` +
          `Prompt length: ${trimmedPrompt.length} chars / ~${Math.round(trimmedPrompt.length / 4)} tokens\n` +
          `Max tokens requested: ${maxTokens}\n` +
          `Raw response: ${JSON.stringify(data)}`
        );
        continue;
      }

      return trimToLastSentence(text);
    }

    const plainText = raw.trim();
    if (!plainText) {
      lastError = `Kobold API returned empty plain-text on ${endpoint}.`;
      continue;
    }
    return trimToLastSentence(plainText);
  }

  throw new Error(lastError);
}

export function Kobold({ prompt, auto = true, onResponse, onError, render }: KoboldProps) {
  const [state, setState] = useState<KoboldState>({
    loading: false,
    response: '',
    error: null,
  });

  const run = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setState({ loading: false, response: '', error: null });
      return;
    }

    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const nextResponse = await callKoboldApi(trimmedPrompt);
      setState({ loading: false, response: nextResponse, error: null });
      onResponse?.(nextResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error from Kobold API.';
      setState({ loading: false, response: '', error: message });
      onError?.(message);
    }
  }, [onError, onResponse, prompt]);

  useEffect(() => {
    if (!auto) {
      return;
    }

    void run();
  }, [auto, run]);

  if (render) {
    return <>{render(state)}</>;
  }

  if (state.error) {
    return <Text>{state.error}</Text>;
  }

  if (state.loading) {
    return <Text>Loading...</Text>;
  }

  return <Text>{state.response}</Text>;
}

function extractResponseText(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }

  if (data && typeof data === 'object') {
    const objectData = data as {
      response?: string;
      text?: string;
      content?: string;
      results?: { text?: string }[];
      choices?: { text?: string; message?: { content?: string } }[];
    };

    if (typeof objectData.response === 'string') {
      return objectData.response;
    }
    if (typeof objectData.text === 'string') {
      return objectData.text;
    }
    if (typeof objectData.content === 'string') {
      return objectData.content;
    }
    if (Array.isArray(objectData.results) && typeof objectData.results[0]?.text === 'string') {
      return objectData.results[0].text;
    }
    if (Array.isArray(objectData.choices)) {
      const choice = objectData.choices[0];
      if (typeof choice?.text === 'string') {
        return choice.text;
      }
      if (typeof choice?.message?.content === 'string') {
        return choice.message.content;
      }
    }
  }

  return '';
}

function buildRequestBody(endpoint: string, prompt: string, maxTokens: number) {
  if (endpoint === '/v1/chat/completions' || endpoint === '/api/v1/chat/completions') {
    return {
      model: 'koboldcpp',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.8,
      top_p: 0.9,
    };
  }

  if (endpoint === '/api/v1/generate' || endpoint === '/v1/generate') {
    return {
      prompt,
      max_length: maxTokens,
      temperature: 0.8,
      top_p: 0.9,
    };
  }

  if (endpoint === '/v1/completions' || endpoint === '/api/v1/completions') {
    return {
      model: 'koboldcpp',
      prompt,
      max_tokens: maxTokens,
      temperature: 0.8,
      top_p: 0.9,
    };
  }

  return { prompt };
}
