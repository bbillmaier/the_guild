export type GuildNote = {
  id: number;
  title: string;
  createdAt: string;
};

const storageKey = 'guild_notes';

function readNotes(): GuildNote[] {
  try {
    const stored = globalThis.localStorage?.getItem(storageKey);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as GuildNote[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.error(error);
    return [];
  }
}

function writeNotes(notes: GuildNote[]) {
  try {
    globalThis.localStorage?.setItem(storageKey, JSON.stringify(notes));
  } catch (error) {
    console.error(error);
  }
}

export async function initializeDatabase() {
  return;
}

export async function listGuildNotes() {
  return readNotes().sort((a, b) => b.id - a.id);
}

export async function addGuildNote(title: string) {
  const notes = readNotes();
  const nextId = notes.length === 0 ? 1 : Math.max(...notes.map((note) => note.id)) + 1;

  notes.push({
    id: nextId,
    title,
    createdAt: new Date().toISOString(),
  });

  writeNotes(notes);
}

export async function deleteGuildNote(id: number) {
  const notes = readNotes().filter((note) => note.id !== id);
  writeNotes(notes);
}
