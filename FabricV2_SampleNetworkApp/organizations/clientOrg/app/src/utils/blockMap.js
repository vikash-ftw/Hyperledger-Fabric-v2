class BlockMap {
    constructor() {
        this.map = new Map();
    }

    get(key) {
        return this.map.get(key);
    }

    set(key, value) {
        this.map.set(key, value);
    }

    remove(key) {
        this.map.delete(key);
    }

}

// Export a singleton instance like before
// this class instance will handle block processing
export const ProcessingMap = new BlockMap();