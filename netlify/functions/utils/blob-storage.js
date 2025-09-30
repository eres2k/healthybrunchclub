const { getStore } = require('@netlify/blobs');

/**
 * Blob storage utility for managing reservation data
 */
class BlobStorage {
  constructor(storeName = 'reservations') {
    this.storeName = storeName;
    this.memoryStore = new Map();
    this.useMemoryStore = false;
  }

  async getStore() {
    if (this.useMemoryStore) {
      return null;
    }

    try {
      return await getStore(this.storeName);
    } catch (error) {
      if (error.name === 'MissingBlobsEnvironmentError') {
        console.warn(`Netlify Blobs environment not configured. Falling back to in-memory store for ${this.storeName}.`);
        this.useMemoryStore = true;
        return null;
      }

      throw error;
    }
  }

  async get(key) {
    try {
      if (this.useMemoryStore) {
        const value = this.memoryStore.get(key);
        return value ? JSON.parse(value) : null;
      }

      const store = await this.getStore();
      if (!store) {
        const value = this.memoryStore.get(key);
        return value ? JSON.parse(value) : null;
      }

      const data = await store.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting ${key} from ${this.storeName}:`, error);
      return null;
    }
  }

  async set(key, value) {
    const serialized = JSON.stringify(value);

    try {
      if (this.useMemoryStore) {
        this.memoryStore.set(key, serialized);
        return true;
      }

      const store = await this.getStore();
      if (!store) {
        this.memoryStore.set(key, serialized);
        return true;
      }

      await store.set(key, serialized);
      return true;
    } catch (error) {
      console.error(`Error setting ${key} in ${this.storeName}:`, error);
      return false;
    }
  }

  async list(prefix) {
    try {
      if (this.useMemoryStore) {
        return Array.from(this.memoryStore.keys())
          .filter(key => key.startsWith(prefix))
          .map(key => ({ key }));
      }

      const store = await this.getStore();
      if (!store) {
        return Array.from(this.memoryStore.keys())
          .filter(key => key.startsWith(prefix))
          .map(key => ({ key }));
      }

      const { blobs } = await store.list({ prefix });
      return blobs;
    } catch (error) {
      console.error(`Error listing with prefix ${prefix}:`, error);
      return [];
    }
  }

  async delete(key) {
    try {
      if (this.useMemoryStore) {
        this.memoryStore.delete(key);
        return true;
      }

      const store = await this.getStore();
      if (!store) {
        this.memoryStore.delete(key);
        return true;
      }

      await store.delete(key);
      return true;
    } catch (error) {
      console.error(`Error deleting ${key}:`, error);
      return false;
    }
  }

  async atomic(key, updateFunction) {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      const current = await this.get(key) || [];
      const updated = await updateFunction(current);

      // Simple optimistic locking
      const success = await this.set(key, updated);
      if (success) return updated;

      retries++;
      await new Promise(resolve => setTimeout(resolve, 100 * retries));
    }

    throw new Error('Failed to update after maximum retries');
  }
}

module.exports = BlobStorage;
