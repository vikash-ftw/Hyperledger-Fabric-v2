class BlockMap {
    constructor() {
        this.list = [];
    }

    get(key) {
        key = parseInt(key,10).toString();
        return this.list[`block${key}`];
    }
    set(key,value) {
        this.list[`block${key}`] = value;
    }
    remove(key) {
        key = parseInt(key, 10).toString();
        delete this.list[`block${key}`];
    }
}

let ProcessingMap = new BlockMap();

export {BlockMap};
export {ProcessingMap};