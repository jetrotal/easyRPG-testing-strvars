const initializeFileManager = () => {
  const SAVE_FOLDER = `/easyrpg/${easyrpgPlayer.game}/Save`;
  const FILE_DATA_STORE = "FILE_DATA";
  const FILE_MODE = 33206;

  const getFullPath = (path) => `${SAVE_FOLDER}/${path}`;
  const encodeContent = (content) => new TextEncoder().encode(content);
  const decodeContent = (contentsUint8) => new TextDecoder("utf-8").decode(contentsUint8);

  class IndexedDBManager {
    static async openDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(SAVE_FOLDER);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    static async performTransaction(storeName, mode, callback) {
      const db = await this.openDB();
      const transaction = db.transaction([storeName], mode);
      const objectStore = transaction.objectStore(storeName);
      return callback(objectStore);
    }
  }

  class FileOperations {
  static activeWatchers = new Map();
      
  static async updateFile(content, path, storeFileGlobally = true) {
    try {
      const saveFile = FileOperations._createSaveFile(content);
      await FileOperations._storeLocalEntry(path, saveFile);
      if (storeFileGlobally) {
        await FileOperations._storeFileInIndexedDB(saveFile, path);
      }
      return true;
    } catch (error) {
      console.error("Error updating file:", error);
      return false;
    }
  }

  static async listFiles() {
    return IndexedDBManager.performTransaction(FILE_DATA_STORE, "readonly", (objectStore) => {
      return new Promise((resolve) => {
        const fileKeys = [];
        objectStore.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.key.startsWith(SAVE_FOLDER)) {
              fileKeys.push(cursor.key);
            }
            cursor.continue();
          } else {
            resolve(fileKeys);
          }
        };
      });
    });
  }

  static async readFile(path) {
    return IndexedDBManager.performTransaction(FILE_DATA_STORE, "readonly", (objectStore) => {
      return new Promise((resolve) => {
        objectStore.get(getFullPath(path)).onsuccess = (event) => {
          const result = event.target.result;
          resolve(result ? decodeContent(result.contents) : null);
        };
      });
    });
  }

  static async deleteFile(path, deleteFileGlobally = true) {
    try {
      await FileOperations._removeLocalEntry(path);
      if (deleteFileGlobally) {
        await FileOperations._deleteFileFromIndexedDB(path);
      }
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  static async watchFile(path, callback) {
    if (this.activeWatchers.has(path)) {
      console.warn(`A watcher for ${path} already exists. Stopping the existing watcher.`);
      this.stopWatching(path);
    }

    let lastContent = null;
    let isWatching = true;

    const checkForChanges = async () => {
      if (!isWatching) return;

      try {
        const currentContent = await this.readFile(path);
        
        if (lastContent === null) {
          lastContent = currentContent;
          if (currentContent !== null) {
            // File exists on first check, trigger callback
            await callback(currentContent, null);
          }
        } else if (currentContent !== lastContent) {
          // Content changed
          await callback(currentContent, lastContent);
          lastContent = currentContent;
        } else if (currentContent === null && lastContent !== null) {
          // File was deleted
          await callback(null, lastContent);
          lastContent = null;
        }
      } catch (error) {
        console.error(`Error checking file ${path}:`, error);
      }

      if (isWatching) {
        setTimeout(checkForChanges, 1000); // Check every second
      }
    };

    checkForChanges();

    const stopWatching = () => {
      isWatching = false;
      this.activeWatchers.delete(path);
      console.log(`Stopped watching file: ${path}`);
    };

    this.activeWatchers.set(path, stopWatching);
    console.log(`Started watching file: ${path}`);

    return stopWatching;
  }

  static stopAllWatchers() {
    for (const [path, stopWatcher] of this.activeWatchers) {
      stopWatcher();
    }
    this.activeWatchers.clear();
    console.log("All file watchers stopped");
  }
    
  static _createSaveFile(content) {
    return {
      timestamp: new Date(),
      mode: FILE_MODE,
      contents: encodeContent(content)
    };
  }

  static async _storeLocalEntry(path, saveFile) {
    return new Promise((resolve) => {
      easyrpgPlayer.saveFs.storeLocalEntry(getFullPath(path), saveFile, resolve);
      easyrpgPlayer.saveFs.storeRemoteEntry(getFullPath(path), saveFile, resolve);
    });
  }

  static async _storeFileInIndexedDB(saveFile, path) {
    return IndexedDBManager.performTransaction(FILE_DATA_STORE, "readwrite", (objectStore) => {
      return new Promise((resolve) => {
        objectStore.put(saveFile, getFullPath(path)).onsuccess = () => resolve(true);
      });
    });
  }

  static async _removeLocalEntry(path) {
  return new Promise((resolve, reject) => {
    easyrpgPlayer.saveFs.removeLocalEntry(getFullPath(path), (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

  static async _deleteFileFromIndexedDB(path) {
    return IndexedDBManager.performTransaction(FILE_DATA_STORE, "readwrite", (objectStore) => {
      return new Promise((resolve, reject) => {
        const request = objectStore.delete(getFullPath(path));
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }
}

  const exampleUsage = async () => {
    try {
      await FileOperations.updateFile(`Hello, \n${Date().split('GMT')[0]}!`, "Text/test.txt");
      console.log("File updated");

      const files = await FileOperations.listFiles();
      console.log("Files:", files);

      const content = await FileOperations.readFile("Text/test.txt");
      console.log("File content:", content);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Expose necessary objects and functions to the global scope as const
  Object.defineProperties(window, {
    SAVE_FOLDER: { value: SAVE_FOLDER, writable: false, configurable: false },
    FILE_DATA_STORE: { value: FILE_DATA_STORE, writable: false, configurable: false },
    FILE_MODE: { value: FILE_MODE, writable: false, configurable: false },
    getFullPath: { value: getFullPath, writable: false, configurable: false },
    encodeContent: { value: encodeContent, writable: false, configurable: false },
    decodeContent: { value: decodeContent, writable: false, configurable: false },
    IndexedDBManager: { value: Object.freeze(IndexedDBManager), writable: false, configurable: false },
    FileOperations: { value: Object.freeze(FileOperations), writable: false, configurable: false },
    exampleUsage: { value: exampleUsage, writable: false, configurable: false }
  });

  //exampleUsage();
  connect();
};

const checkConditions = () => {
  if (typeof easyrpgPlayer !== 'undefined' && easyrpgPlayer.calledRun) {
    clearInterval(checkInterval);
    initializeFileManager();
    
  }
};

const checkInterval = setInterval(checkConditions, 100);