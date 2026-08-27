// Safe Storage utility wrapper for localStorage & sessionStorage
// Prevents SecurityError crashes when third-party cookies or storage access is blocked by browsers or WebViews.

const memoryLocalStorage = new Map();
const memorySessionStorage = new Map();

export const safeLocalStorage = {
    getItem: (key) => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem(key);
            }
        } catch (e) {
            console.warn(`localStorage.getItem failed for "${key}" (falling back to memory):`, e);
        }
        return memoryLocalStorage.get(key) || null;
    },

    setItem: (key, value) => {
        const valStr = String(value);
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, valStr);
                return;
            }
        } catch (e) {
            console.warn(`localStorage.setItem failed for "${key}" (falling back to memory):`, e);
        }
        memoryLocalStorage.set(key, valStr);
    },

    removeItem: (key) => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
                return;
            }
        } catch (e) {
            console.warn(`localStorage.removeItem failed for "${key}" (falling back to memory):`, e);
        }
        memoryLocalStorage.delete(key);
    },

    clear: () => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.clear();
            }
        } catch (e) {
            console.warn('localStorage.clear failed (falling back to memory):', e);
        }
        memoryLocalStorage.clear();
    }
};

export const safeSessionStorage = {
    getItem: (key) => {
        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                return window.sessionStorage.getItem(key);
            }
        } catch (e) {
            console.warn(`sessionStorage.getItem failed for "${key}" (falling back to memory):`, e);
        }
        return memorySessionStorage.get(key) || null;
    },

    setItem: (key, value) => {
        const valStr = String(value);
        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.setItem(key, valStr);
                return;
            }
        } catch (e) {
            console.warn(`sessionStorage.setItem failed for "${key}" (falling back to memory):`, e);
        }
        memorySessionStorage.set(key, valStr);
    },

    removeItem: (key) => {
        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.removeItem(key);
                return;
            }
        } catch (e) {
            console.warn(`sessionStorage.removeItem failed for "${key}" (falling back to memory):`, e);
        }
        memorySessionStorage.delete(key);
    },

    clear: () => {
        try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.clear();
            }
        } catch (e) {
            console.warn('sessionStorage.clear failed (falling back to memory):', e);
        }
        memorySessionStorage.clear();
    }
};
