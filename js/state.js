export function createStore(initialState = {}) {
  const clone = typeof structuredClone === 'function' ? structuredClone : (value) => JSON.parse(JSON.stringify(value));
  const state = clone(initialState);
  const listeners = new Map();

  function notify(key) {
    const callbacks = listeners.get(key);
    if (!callbacks) return;
    callbacks.forEach((callback) => {
      try {
        callback(state[key], state);
      } catch (error) {
        console.error('State listener error', error);
      }
    });
  }

  return {
    getState() {
      return state;
    },
    setState(partial) {
      let keysToNotify = new Set();
      Object.entries(partial).forEach(([key, value]) => {
        const current = state[key];
        const isMap = current instanceof Map && value instanceof Map;
        if (isMap) {
          const changed = current.size !== value.size || Array.from(value.keys()).some((k) => current.get(k) !== value.get(k));
          if (changed) {
            state[key] = value;
            keysToNotify.add(key);
          }
        } else if (current !== value) {
          state[key] = value;
          keysToNotify.add(key);
        }
      });
      keysToNotify.forEach((key) => notify(key));
    },
    subscribe(key, callback) {
      if (!listeners.has(key)) {
        listeners.set(key, new Set());
      }
      const callbacks = listeners.get(key);
      callbacks.add(callback);
      return () => {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          listeners.delete(key);
        }
      };
    },
  };
}
