/**
 * Daily room assignments — each character is randomly placed in one room per day.
 * Stored in app_settings so it persists across screen navigations.
 * Recalculated automatically when the game day changes.
 */

import { getSetting, setSetting } from '@/lib/settings';
import type { GuildCharacter } from '@/lib/local-db';

export type RoomKey = 'tavern' | 'barracks' | 'armory';

export type RoomDefinition = {
  key: RoomKey;
  name: string;
  icon: string;
};

export const ROOMS: RoomDefinition[] = [
  { key: 'tavern',   name: "The Wanderer's Rest", icon: '🍺' },
  { key: 'barracks', name: 'Barracks',             icon: '⚔️' },
  { key: 'armory',   name: 'Armory',               icon: '🛡️' },
];

const SETTING_KEY = 'room_assignments';

type Stored = {
  day: number;
  assignments: Record<string, RoomKey>;
  /** Maps uid → groupId string like "tavern_0". Same groupId = same conversation group. */
  groupIds: Record<string, string>;
};

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function roll(characters: GuildCharacter[]): { assignments: Record<string, RoomKey>; groupIds: Record<string, string> } {
  const keys: RoomKey[] = ['tavern', 'barracks', 'armory'];
  const assignments: Record<string, RoomKey> = {};
  for (const c of characters) {
    assignments[c.uid] = keys[Math.floor(Math.random() * keys.length)];
  }
  const groupIds = buildGroupIds(assignments, characters);
  return { assignments, groupIds };
}

/**
 * Split each room's occupants into conversation groups of 2–3.
 * A lone character gets their own group (solo chat).
 */
function buildGroupIds(
  assignments: Record<string, RoomKey>,
  characters: GuildCharacter[],
): Record<string, string> {
  const byRoom: Record<string, string[]> = { tavern: [], barracks: [], armory: [] };
  for (const c of characters) {
    const room = assignments[c.uid];
    if (room) byRoom[room].push(c.uid);
  }
  const groupIds: Record<string, string> = {};
  for (const room of Object.keys(byRoom) as RoomKey[]) {
    const uids = shuffleArr(byRoom[room]);
    let groupIndex = 0;
    let i = 0;
    while (i < uids.length) {
      const remaining = uids.length - i;
      // Prefer groups of 2; use 3 only when it avoids a lone remainder
      const size = remaining === 1 ? 1 : remaining % 2 === 1 && remaining >= 3 ? 3 : 2;
      const chunk = uids.slice(i, i + size);
      for (const uid of chunk) groupIds[uid] = `${room}_${groupIndex}`;
      i += chunk.length;
      groupIndex++;
    }
  }
  return groupIds;
}

/** Return all character UIDs that share a group with the given uid. */
export function getGroupMembers(uid: string, groupIds: Record<string, string>): string[] {
  const gid = groupIds[uid];
  if (!gid) return [uid];
  return Object.entries(groupIds)
    .filter(([, g]) => g === gid)
    .map(([u]) => u);
}

async function save(day: number, assignments: Record<string, RoomKey>, groupIds: Record<string, string>): Promise<void> {
  await setSetting(SETTING_KEY, JSON.stringify({ day, assignments, groupIds } satisfies Stored));
}

/**
 * Return the current room assignments for today.
 * If the stored day differs from `gameDay` (or nothing is stored),
 * new assignments are rolled and persisted automatically.
 */
export type RoomState = {
  assignments: Record<string, RoomKey>;
  groupIds: Record<string, string>;
};

export async function getRoomAssignments(
  gameDay: number,
  characters: GuildCharacter[],
): Promise<RoomState> {
  const raw = await getSetting(SETTING_KEY);
  if (raw) {
    try {
      const stored = JSON.parse(raw) as Stored;
      if (stored.day === gameDay) return { assignments: stored.assignments, groupIds: stored.groupIds ?? {} };
    } catch { /* fall through */ }
  }
  const { assignments, groupIds } = roll(characters);
  await save(gameDay, assignments, groupIds);
  return { assignments, groupIds };
}

/**
 * Force a new roll (called on day end so assignments update immediately).
 */
export async function refreshRoomAssignments(
  gameDay: number,
  characters: GuildCharacter[],
): Promise<RoomState> {
  const { assignments, groupIds } = roll(characters);
  await save(gameDay, assignments, groupIds);
  return { assignments, groupIds };
}

/**
 * Filter a character list to only those assigned to a specific room.
 */
export function filterByRoom(
  characters: GuildCharacter[],
  assignments: Record<string, RoomKey>,
  room: RoomKey,
): GuildCharacter[] {
  return characters.filter((c) => assignments[c.uid] === room);
}
