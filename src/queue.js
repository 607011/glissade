/* Copyright (c) 2023 Oliver Lau <oliver@ersatzworld.net> */

class FIFOQueue {
    #data;

    constructor(data = []) {
        console.assert(data instanceof Array);
        this.#data = data;
    }
    enqueue(item) {
        this.#data.push(item);
    }
    dequeue() {
        if (this.isEmpty())
            throw new Error('Queue underflow');
        return this.#data.shift();
    }
    front() {
        if (this.isEmpty())
            throw new Error('Queue underflow');
        return this._data[0];
    }
    back() {
        if (this.isEmpty())
            throw new Error('Queue underflow');
        return this.#data[this.#data.length - 1];
    }
    get data() {
        return this.#data;
    }
    get length() {
        return this.#data.length;
    }
    isEmpty() {
        return this.length === 0;
    }
    isNotEmpty() {
        return this.length > 0;
    }
}

class PriorityQueue extends FIFOQueue {
    constructor(data) {
        super(data);
    }

    enqueue(element) {
        let contained = false;
        for (let i = 0; i < this._data.length; ++i) {
            if (this._data[i].cost > element.cost) {
                this._data.splice(i, 0, element);
                contained = true;
                break;
            }
        }
        if (!contained) {
            this._data.push(element);
        }
    }
}
