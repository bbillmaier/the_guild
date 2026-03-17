/**
 * Global QuestRunnerContext — fire-and-forget quest execution.
 * Wrap the app root with <QuestRunnerProvider>.
 * Call startQuest() to launch a quest in the background.
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { getGameDay, insertPendingQuestCompletion, type GuildCharacter, type GuildQuest, type PendingQuestCompletion, type QuestRoom } from '@/lib/local-db';
import { runQuestHeadless } from '@/lib/quest-simulation';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RunningQuestEntry = {
  questUid: string;
  questTitle: string;
  partyNames: string[];
  startedAt: string;
};

type QuestRunnerContextType = {
  runningQuests: RunningQuestEntry[];
  startQuest: (quest: GuildQuest, rooms: QuestRoom[], characters: GuildCharacter[]) => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const QuestRunnerContext = createContext<QuestRunnerContextType>({
  runningQuests: [],
  startQuest: () => {},
});

export function useQuestRunner(): QuestRunnerContextType {
  return useContext(QuestRunnerContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function QuestRunnerProvider({ children }: { children: React.ReactNode }) {
  const [runningQuests, setRunningQuests] = useState<RunningQuestEntry[]>([]);
  const runningRef = useRef<Set<string>>(new Set());

  const startQuest = useCallback(
    (quest: GuildQuest, rooms: QuestRoom[], characters: GuildCharacter[]) => {
      // Prevent duplicate runs for the same quest
      if (runningRef.current.has(quest.uid)) return;
      runningRef.current.add(quest.uid);

      const entry: RunningQuestEntry = {
        questUid: quest.uid,
        questTitle: quest.title,
        partyNames: characters.map((c) => c.characterName),
        startedAt: new Date().toISOString(),
      };
      setRunningQuests((prev) => [...prev, entry]);

      // Fire and forget
      void (async () => {
        try {
          const startDay = await getGameDay().catch(() => 1);
          const revealDay = startDay + rooms.length;
          const result = await runQuestHeadless(quest, rooms, characters);

          const pendingUid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          });
          const pending: PendingQuestCompletion = {
            uid: pendingUid,
            questUid: quest.uid,
            questTitle: quest.title,
            revealDay,
            outcome: result.outcome,
            partyUids: characters.map((c) => c.uid),
            partyNames: characters.map((c) => c.characterName),
            xpChanges: result.xpChanges,
            gold: result.reward?.gold ?? 0,
            itemData: result.reward?.items ?? [],
            relationshipDelta: result.relationshipDelta,
            createdAt: new Date().toISOString(),
          };
          await insertPendingQuestCompletion(pending).catch(console.error);
        } catch (err) {
          console.error('[QuestRunner] Quest simulation failed:', err);
        } finally {
          runningRef.current.delete(quest.uid);
          setRunningQuests((prev) => prev.filter((q) => q.questUid !== quest.uid));
        }
      })();
    },
    [],
  );

  return (
    <QuestRunnerContext.Provider value={{ runningQuests, startQuest }}>
      {children}
    </QuestRunnerContext.Provider>
  );
}
