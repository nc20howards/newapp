import type { ConversationEntry } from '../types';

const DB_NAME = '360SmartSchoolDB';
const DB_VERSION = 1;
const STORE_NAME = 'conversationHistory';

let db: IDBDatabase;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject('Error opening database.');
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

export const addMessage = async (entry: Omit<ConversationEntry, 'id' | 'feedback'>): Promise<number> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({ ...entry, feedback: null });

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => {
      console.error('Error adding message to DB:', request.error);
      reject('Could not add message.');
    };
  });
};

export const getHistory = async (): Promise<ConversationEntry[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error fetching history:', request.error);
            reject('Could not fetch history.');
        };
    });
};

export const clearHistory = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('Error clearing history:', request.error);
            reject('Could not clear history.');
        };
    });
};

export const updateMessageFeedback = async (id: number, feedback: 'up' | 'down' | null): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const entry = getRequest.result as ConversationEntry | undefined;
            if (entry) {
                entry.feedback = feedback;
                const putRequest = store.put(entry);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => {
                    console.error('Error updating feedback in DB:', putRequest.error);
                    reject('Could not update feedback.');
                };
            } else {
                reject('Message not found.');
            }
        };

        getRequest.onerror = () => {
            console.error('Error getting message to update feedback:', getRequest.error);
            reject('Could not find message to update.');
        };
    });
};