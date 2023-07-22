/**
 * Simple pool implementation. Allows for the grabbing and freeing of arbritrary objects to reduce gc overhead.
 */
export class Pool<T> {
  protected readonly active: Set<T> = new Set();
  protected readonly available: Set<T> = new Set();

  constructor(create: () => T, count: number) {
    this.available = new Set(Array.from({ length: count }, create));
  }

  public free(t: T) {
    this.active.delete(t);
    this.available.add(t);
  }

  public get(): T {
    const [t] = this.available;
    if (t == undefined) {
      throw new Error("All pool members are in use.");
    }

    this.available.delete(t);
    this.active.add(t);
    return t;
  }
}

/**
 * Extends the base pool with functionality to create new objects on the fly.
 * This works well if you think you may need to exceed your initial pool size.
 */
export class InfinitePool<T> extends Pool<T> {
  protected readonly create: () => T;

  constructor(create: () => T, count: number) {
    super(create, count);
    this.create = create;
  }

  public override get(): T {
    let t: T;
    // try to grab an available object but create a new active object if we can't
    try {
      t = super.get();
    } catch {
      t = this.create();
      this.active.add(t);
    }
    return t;
  }
}
