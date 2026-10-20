// The checkpoint save: one save, in IndexedDB (the browser's, for this site), with persistent
// storage asked for so the browser doesn't clear it to free space. It keeps what the story needs and
// nothing of the props: the checkpoint (a scene's id) and Ink's whole state; the doors, the props and
// her position come back from the scene's setup. Written at every scene start once the game has begun
// (main.ts); read at load, for *Continue* on the start screen.
// Plan: doc/plans/architecture/game-architecture/game-structure.md (pass 4); doc/plans/architecture/game-architecture/saving.md

/** Raised when what a save holds changes (an older one is then brought up to date in `readSave`); a newer one is ignored. */
export const SAVE_FORMAT = 1;

export interface SaveData {
  format: number;
  /** The game's version that wrote it (package.json). */
  game: string;
  /** The scene to start again: the checkpoint. */
  checkpoint: string;
  /** Its location (only the ship so far). */
  location: 'ship';
  /** Ink's state (`GameStory.state()`). */
  story: string;
  /** Empty until the comm exists. */
  missionData: unknown[];
  chat: unknown[];
  /** When it was written (ISO time). */
  savedAt: string;
}

const DB = 'zamboni';
const STORE = 'saves';
const KEY = 'checkpoint';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB not opened'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = act(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  } finally {
    db.close();
  }
}

/** The save, or null if there's none (or one this version can't read: it's left as it is). */
export async function readSave(): Promise<SaveData | null> {
  const data = (await withStore('readonly', (store) => store.get(KEY))) as Partial<SaveData> | undefined;
  if (!data) return null;
  if (typeof data.format !== 'number' || data.format > SAVE_FORMAT || typeof data.checkpoint !== 'string' || typeof data.story !== 'string') {
    console.warn(`[0.0.2] save: not readable by this version (format ${data.format}, game ${data.game})`);
    return null;
  }
  return data as SaveData;
}

let persistAsked = false;

export async function writeSave(data: Omit<SaveData, 'format' | 'game' | 'savedAt'>): Promise<void> {
  if (!persistAsked) {
    persistAsked = true;
    // Chrome grants it by itself or not (how much the site is used); no prompt.
    void navigator.storage?.persist?.().then((granted) => console.info(`[0.0.2] save: persistent storage ${granted ? 'granted' : 'not granted'}`));
  }
  const save: SaveData = { format: SAVE_FORMAT, game: __VERSION__, savedAt: new Date().toISOString(), ...data };
  await withStore('readwrite', (store) => store.put(save, KEY));
  console.info(`[0.0.2] save: checkpoint ${save.checkpoint}`);
}

export async function clearSave(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(KEY));
}
