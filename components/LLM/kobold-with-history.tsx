import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Text } from 'react-native';

const koboldApiEndpoint = 'http://localhost:5001/api';

export type KoboldWithHistoryState = {
  loading: boolean;
  response: string;
  error: string | null;
};

export type KoboldWithHistoryProps = {
  prompt: string;
  history: string;
  auto?: boolean;
  onResponse?: (response: string) => void;
  onError?: (error: string) => void;
  render?: (state: KoboldWithHistoryState) => ReactNode;
};

export async function callKoboldApiWithHistory(prompt: string, history: string) {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    return '';
  }

  const response = await fetch(koboldApiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: trimmedPrompt,
      history,
    }),
  });

  if (!response.ok) {
    throw new Error(`Kobold API request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as unknown;
  return extractResponseText(data);
}

export function KoboldWithHistory({
  prompt,
  history,
  auto = true,
  onResponse,
  onError,
  render,
}: KoboldWithHistoryProps) {
  const [state, setState] = useState<KoboldWithHistoryState>({
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
      const nextResponse = await callKoboldApiWithHistory(trimmedPrompt, history);
      setState({ loading: false, response: nextResponse, error: null });
      onResponse?.(nextResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error from Kobold API.';
      setState({ loading: false, response: '', error: message });
      onError?.(message);
    }
  }, [history, onError, onResponse, prompt]);

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
