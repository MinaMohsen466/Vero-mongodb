class CacheManager {
    constructor(ttlMs = 30000) {
        this.cache = new Map();
        this.ttlMs = ttlMs;
    }

    get(category, key = 'all') {
        const fullKey = `${category}:${key}`;
        if (this.cache.has(fullKey)) {
            const { value, expiry } = this.cache.get(fullKey);
            if (Date.now() < expiry) {
                try {
                    return JSON.parse(JSON.stringify(value));
                } catch (e) {
                    return value;
                }
            }
            this.cache.delete(fullKey);
        }
        return null;
    }

    set(category, value, key = 'all') {
        const fullKey = `${category}:${key}`;
        const expiry = Date.now() + this.ttlMs;
        let valueToStore = value;
        try {
            valueToStore = JSON.parse(JSON.stringify(value));
        } catch (e) {}
        this.cache.set(fullKey, { value: valueToStore, expiry });
    }

    invalidate(category) {
        for (const fullKey of this.cache.keys()) {
            if (fullKey.startsWith(`${category}:`)) {
                this.cache.delete(fullKey);
            }
        }
    }

    clearAll() {
        this.cache.clear();
    }
}

module.exports = CacheManager;
