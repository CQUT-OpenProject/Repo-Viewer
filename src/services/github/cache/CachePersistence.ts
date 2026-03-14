import { logger } from "@/utils";
import type { CacheConfig, CacheItemMeta } from "./CacheTypes";

/**
 * 持久化存储句柄接口
 */
export interface PersistenceHandles {
  dbName: string;
  db: IDBDatabase | null;
}

/**
 * 构建数据库名称
 *
 * @param storageKey - 存储键名
 * @returns 数据库名称
 */
export const buildDbName = (storageKey: string): string =>
  `RepoViewerCache_${storageKey.replace(/[^a-zA-Z0-9]/g, "_")}`;

/**
 * 确保对象存储已创建
 *
 * @param db - IndexedDB数据库实例
 * @param storageKey - 存储键名
 * @returns void
 */
const ensureObjectStore = (db: IDBDatabase, storageKey: string): void => {
  if (db.objectStoreNames.contains(storageKey)) {
    return;
  }
  const store = db.createObjectStore(storageKey, { keyPath: "key" });
  store.createIndex("timestamp", "timestamp", { unique: false });
  store.createIndex("lastAccess", "lastAccess", { unique: false });
  logger.debug(`创建IndexedDB object store: ${storageKey}`);
};

const withObjectStore = <T>(
  db: IDBDatabase | null,
  config: CacheConfig,
  mode: IDBTransactionMode,
  fallback: T,
  executor: (
    store: IDBObjectStore,
    resolve: (value: T) => void,
    transaction: IDBTransaction,
  ) => void,
): Promise<T> => {
  return new Promise((resolve) => {
    if (db === null) {
      resolve(fallback);
      return;
    }
    try {
      if (!db.objectStoreNames.contains(config.storageKey)) {
        resolve(fallback);
        return;
      }
      const transaction = db.transaction([config.storageKey], mode);
      const store = transaction.objectStore(config.storageKey);
      const resolveWithFallback = (): void => {
        resolve(fallback);
      };
      transaction.onerror = resolveWithFallback;
      transaction.onabort = resolveWithFallback;
      executor(store, resolve, transaction);
    } catch {
      resolve(fallback);
    }
  });
};

export async function initIndexedDB(
  handles: PersistenceHandles,
  config: CacheConfig,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const versionRequest = indexedDB.open(handles.dbName);
    versionRequest.onsuccess = () => {
      const currentDb = versionRequest.result;
      const needsUpgrade = !currentDb.objectStoreNames.contains(config.storageKey);
      const currentVersion = currentDb.version;
      currentDb.close();
      const targetVersion = needsUpgrade ? currentVersion + 1 : currentVersion;
      const request = indexedDB.open(handles.dbName, targetVersion);
      request.onerror = () => {
        logger.warn("IndexedDB打开失败", request.error);
        reject(new Error(`IndexedDB打开失败: ${request.error?.message ?? "Unknown error"}`));
      };
      request.onsuccess = () => {
        handles.db = request.result;
        handles.db.onerror = (event) => {
          logger.warn("IndexedDB运行时错误", event);
        };
        handles.db.onversionchange = () => {
          logger.info("IndexedDB版本变更，关闭连接");
          handles.db?.close();
          handles.db = null;
        };
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        try {
          ensureObjectStore(db, config.storageKey);
        } catch (error) {
          logger.warn("创建IndexedDB object store失败", error);
          throw error;
        }
      };
      request.onblocked = () => {
        logger.warn("IndexedDB升级被阻塞，可能有其他标签页正在使用数据库");
        setTimeout(() => {
          reject(new Error("IndexedDB升级被阻塞"));
        }, 5000);
      };
    };
    versionRequest.onerror = () => {
      logger.debug("无法获取IndexedDB版本，尝试创建新数据库");
      const request = indexedDB.open(handles.dbName, 1);
      request.onerror = () => {
        logger.warn("IndexedDB创建失败", request.error);
        reject(new Error(`IndexedDB创建失败: ${request.error?.message ?? "Unknown error"}`));
      };
      request.onsuccess = () => {
        handles.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        try {
          ensureObjectStore(db, config.storageKey);
        } catch (error) {
          logger.warn("创建IndexedDB object store失败", error);
          throw error;
        }
      };
    };
  });
}

export async function deleteDatabase(dbName: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      deleteRequest.onsuccess = () => {
        logger.debug(`删除IndexedDB数据库成功: ${dbName}`);
        resolve();
      };
      deleteRequest.onerror = () => {
        logger.warn(`删除IndexedDB数据库失败: ${dbName}`, deleteRequest.error);
        resolve();
      };
      deleteRequest.onblocked = () => {
        logger.warn(`删除IndexedDB数据库被阻塞: ${dbName}`);
        setTimeout(() => {
          resolve();
        }, 1000);
      };
    } catch (error) {
      logger.warn(`删除IndexedDB数据库异常: ${dbName}`, error);
      resolve();
    }
  });
}

/**
 * 从IndexedDB加载缓存项
 *
 * @param db - IndexedDB数据库实例
 * @param config - 缓存配置
 * @param key - 缓存键
 * @returns Promise，解析为缓存项元数据或undefined
 */
export function loadItemFromIndexedDB(
  db: IDBDatabase | null,
  config: CacheConfig,
  key: string,
): Promise<CacheItemMeta | undefined> {
  return withObjectStore<CacheItemMeta | undefined>(
    db,
    config,
    "readonly",
    undefined,
    (store, resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result as
          | { key: string; data: CacheItemMeta; timestamp: number; lastAccess: number }
          | undefined;
        resolve(result !== undefined ? result.data : undefined);
      };
      request.onerror = () => {
        resolve(undefined);
      };
    },
  );
}

/**
 * 保存缓存项到IndexedDB
 *
 * @param db - IndexedDB数据库实例
 * @param config - 缓存配置
 * @param key - 缓存键
 * @param item - 缓存项元数据
 * @returns Promise，保存完成后解析
 */
export function saveItemToIndexedDB(
  db: IDBDatabase | null,
  config: CacheConfig,
  key: string,
  item: CacheItemMeta,
): Promise<void> {
  return withObjectStore(db, config, "readwrite", undefined, (store, resolve) => {
    const request = store.put({
      key,
      data: item,
      timestamp: item.timestamp,
      lastAccess: item.lastAccess,
    });
    request.onsuccess = () => {
      resolve(undefined);
    };
    request.onerror = () => {
      resolve(undefined);
    };
  });
}

/**
 * 从IndexedDB删除缓存项
 *
 * @param db - IndexedDB数据库实例
 * @param config - 缓存配置
 * @param key - 缓存键
 * @returns Promise，删除完成后解析
 */
export function deleteItemFromIndexedDB(
  db: IDBDatabase | null,
  config: CacheConfig,
  key: string,
): Promise<void> {
  return withObjectStore(db, config, "readwrite", undefined, (store, resolve) => {
    const request = store.delete(key);
    request.onsuccess = () => {
      resolve(undefined);
    };
    request.onerror = () => {
      resolve(undefined);
    };
  });
}

/**
 * 清空IndexedDB中的所有缓存
 *
 * @param db - IndexedDB数据库实例
 * @param config - 缓存配置
 * @returns Promise，清空完成后解析
 */
export function clearIndexedDB(db: IDBDatabase | null, config: CacheConfig): Promise<void> {
  return withObjectStore(db, config, "readwrite", undefined, (store, resolve) => {
    const request = store.clear();
    request.onsuccess = () => {
      resolve(undefined);
    };
    request.onerror = () => {
      resolve(undefined);
    };
  });
}

/**
 * 从IndexedDB加载所有缓存项
 *
 * @param db - IndexedDB数据库实例
 * @param config - 缓存配置
 * @returns Promise，解析为所有缓存项的数组
 */
export function loadAllFromIndexedDB(
  db: IDBDatabase | null,
  config: CacheConfig,
): Promise<{ key: string; data: CacheItemMeta; timestamp: number }[]> {
  return withObjectStore(
    db,
    config,
    "readonly",
    [] as { key: string; data: CacheItemMeta; timestamp: number }[],
    (store, resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const result = request.result as
          | { key: string; data: CacheItemMeta; timestamp: number }[]
          | undefined;
        resolve(Array.isArray(result) ? result : []);
      };
      request.onerror = () => {
        resolve([]);
      };
    },
  );
}

/**
 * 从LocalStorage加载缓存项
 *
 * @param config - 缓存配置
 * @param key - 缓存键
 * @returns Promise，解析为缓存项元数据或undefined
 */
export function loadItemFromLocalStorage(
  config: CacheConfig,
  key: string,
): Promise<CacheItemMeta | undefined> {
  return new Promise((resolve) => {
    try {
      const item = localStorage.getItem(`${config.storageKey}_${key}`);
      if (item !== null) {
        resolve(JSON.parse(item) as CacheItemMeta);
      } else {
        resolve(undefined);
      }
    } catch (error) {
      logger.warn("从localStorage加载缓存项失败", error);
      resolve(undefined);
    }
  });
}

/**
 * 保存缓存项到LocalStorage
 *
 * @param config - 缓存配置
 * @param key - 缓存键
 * @param item - 缓存项元数据
 * @returns Promise，保存完成后解析
 */
export function saveItemToLocalStorage(
  config: CacheConfig,
  key: string,
  item: CacheItemMeta,
): Promise<void> {
  return new Promise((resolve) => {
    try {
      localStorage.setItem(`${config.storageKey}_${key}`, JSON.stringify(item));
      resolve();
    } catch (error) {
      logger.warn("保存缓存项到localStorage失败", error);
      resolve();
    }
  });
}

/**
 * 从LocalStorage删除缓存项
 *
 * @param config - 缓存配置
 * @param key - 缓存键
 * @returns Promise，删除完成后解析
 */
export function deleteItemFromLocalStorage(config: CacheConfig, key: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      localStorage.removeItem(`${config.storageKey}_${key}`);
      resolve();
    } catch (error) {
      logger.warn("从localStorage删除缓存项失败", error);
      resolve();
    }
  });
}

/**
 * 清空LocalStorage中的所有缓存
 *
 * @param config - 缓存配置
 * @returns Promise，清空完成后解析
 */
export function clearLocalStorage(config: CacheConfig): Promise<void> {
  return new Promise((resolve) => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${config.storageKey}_`) === true) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
      });
      resolve();
    } catch (error) {
      logger.warn("清除localStorage失败", error);
      resolve();
    }
  });
}
