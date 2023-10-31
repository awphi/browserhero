import { get, writable, type Writable } from "svelte/store";

export function storable<T>(key: string, data: T): Writable<T> {
  const store = writable(data);
  const isBrowser = typeof window !== "undefined";

  if (isBrowser) {
    const v = localStorage.getItem(key);
    if (v) {
      store.set(JSON.parse(v));
    }
  }

  return {
    subscribe: store.subscribe,
    set: (n) => {
      if (isBrowser) {
        localStorage.setItem(key, JSON.stringify(n));
      }
      store.set(n);
    },
    update: (cb) => {
      const updatedStore = cb(get(store));
      if (isBrowser) {
        localStorage.setItem(key, JSON.stringify(updatedStore));
      }
      store.set(updatedStore);
    },
  };
}
