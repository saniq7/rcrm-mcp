/**
 * Простой кэш с TTL (Time To Live)
 */
export class Cache {
  private store: Map<string, { value: any; expiresAt: number }> = new Map();

  /**
   * Получить значение из кэша
   */
  get(key: string): any | null {
    const item = this.store.get(key);
    
    if (!item) {
      return null;
    }

    if (item.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Установить значение в кэш
   * @param key ключ
   * @param value значение
   * @param ttlMs время жизни в миллисекундах (по умолчанию 1 час)
   */
  set(key: string, value: any, ttlMs: number = 3600000): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Проверить наличие ключа в кэше
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Очистить кэш
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Удалить ключ из кэша
   */
  delete(key: string): void {
    this.store.delete(key);
  }
}

export const globalCache = new Cache();
