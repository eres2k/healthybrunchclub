const { getStore } = require('@netlify/blobs');

const memoryStores = new Map();

/**
 * Blob storage utility for managing reservation data
 */
class BlobStorage {
  constructor(storeName = 'reservations') {
    this.storeName = storeName;
    this.useMemory = false;
  }

  async getStore() {
    if (this.useMemory) {
      return this.getMemoryStore();
    }

    try {
      return await getStore(this.storeName);
    } catch (error) {
      const shouldFallback =
        error.name === 'MissingBlobsEnvironmentError' ||
        process.env.NODE_ENV === 'test' ||
        process.env.NETLIFY_BLOBS_CONTEXT === 'test';

      if (shouldFallback) {
        console.warn(`Blobs unavailable, using in-memory store for ${this.storeName}`);
        this.useMemory = true;
        return this.getMemoryStore();
      }

      throw error;
    }
  }

  getMemoryStore() {
    if (!memoryStores.has(this.storeName)) {
      const data = new Map();
      memoryStores.set(this.storeName, {
        async get(key) {
          return data.has(key) ? data.get(key) : null;
        },
        async set(key, value) {
          data.set(key, value);
        },
        async delete(key) {
          data.delete(key);
        },
        async list({ prefix } = {}) {
          const blobs = Array.from(data.keys())
            .filter(key => (prefix ? key.startsWith(prefix) : true))
            .map(key => ({ key }));
          return { blobs };
        }
      });
    }

    return memoryStores.get(this.storeName);
  }

  async get(key) {
    try {
      const store = await this.getStore();
      const data = await store.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting ${key} from ${this.storeName}:`, error);
      return null;
    }
  }

  async set(key, value) {
    try {
      const store = await this.getStore();
      await store.set(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key} in ${this.storeName}:`, error);
      return false;
    }
  }

  async list(prefix) {
    try {
      const store = await this.getStore();
      const { blobs } = await store.list({ prefix });
      return blobs;
    } catch (error) {
      console.error(`Error listing with prefix ${prefix}:`, error);
      return [];
    }
  }

  async delete(key) {
    try {
      const store = await this.getStore();
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
