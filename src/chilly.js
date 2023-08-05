/* Copyright (c) 2023 Oliver Lau <oliver@ersatzworld.net> */

class Tile {
    static Size = 32;
    static Empty = ' ';
    static Ice = ' ';
    static Marker = '.';
    static Rock = '#';
    static Exit = 'X';
    static Player = 'P';
    static Coin = '$';
    static Gold = 'G';
    static Hole = 'O';
};

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
        return this.#data.shift();
    }
    isNotEmpty() {
        return this.#data.length > 0;
    }
}

class Node {
    #id;
    #x;
    #y;
    #explored;
    #parent;
    constructor(id, x, y, explored = false) {
        this.#id = id;
        this.#x = x;
        this.#y = y;
        this.#explored = explored;
        this.#parent = null;
    }
    /**
     * @param {boolean} explored
     */
    set explored(explored) {
        this.#explored = explored;
    }
    get explored() {
        return this.#explored;
    }
    get x() {
        return this.#x;
    }
    get y() {
        return this.#y;
    }
    /**
     * @param {Node} parent
     */
    set parent(node) {
        this.#parent = node;
    }
    get parent() {
        return this.#parent;
    }
    hasParent() {
        return this.#parent !== null;
    }
    isHole() {
        return this.#id === Tile.Hole;
    }
    isExit() {
        return this.#id === Tile.Exit;
    }
}

class ChillySolver {
    #levelData;
    #holes;
    #rootNode;
    /**
     * @param {Array} levelData
     */
    constructor(levelData) {
        console.assert(levelData instanceof Array);
        console.assert(levelData.length > 0);
        console.assert(levelData[0] instanceof String || levelData[0] instanceof Array);
        console.assert(levelData[0].length > 0);
        this.#levelData = levelData;
        this.#holes = [];
        this.#rootNode = null;
        for (let y = 0; y < this.#levelData.length; ++y) {
            const row = this.row(y);
            for (let x = 0; x < row.length; ++x) {
                switch (row[x]) {
                    case Tile.Player:
                        this.#levelData[y] = row.replace(Tile.Player, Tile.Ice);
                        this.#rootNode = new Node(Tile.Player, x, y, true);
                        break;
                    case Tile.Hole:
                        this.#holes.push({ x, y });
                        break;
                    default:
                        break;
                }
            }
        }
    }
    row(y) {
        return this.#levelData[y];
    }
    cellAt(x, y) {
        return this.#levelData[y][x];
    }
    solve() {
        const DIRECTIONS = [
            { x: 0, y: -1, move: 'U' },
            { x: 0, y: +1, move: 'D' },
            { x: -1, y: 0, move: 'L' },
            { x: +1, y: 0, move: 'R' }
        ];
        const neighborCache = {
            [`${this.#rootNode.x},${this.#rootNode.y}`]: this.#rootNode
        };
        const getCachedNeighbor = (id, x, y) => {
            let neighbor = neighborCache[`${x},${y}`];
            if (!neighbor) {
                neighbor = new Node(id, x, y);
                neighborCache[`${x},${y}`] = neighbor;
            }
            return neighbor;
        };
        const neighbors = function* (origin) {
            for (const d of DIRECTIONS) {
                let { x, y } = origin;
                while ([Tile.Ice, Tile.Coin, Tile.Marker, Tile.Empty].includes(this.cellAt(x + d.x, y + d.y))) {
                    x += d.x;
                    y += d.y;
                }
                const stopTile = this.cellAt(x + d.x, y + d.y);
                switch (stopTile) {
                    case Tile.Exit:
                        yield { move: d.move, node: new Node(stopTile, x + d.x, y + d.y) };
                        break;
                    case Tile.Hole:
                        const otherHole = this.#holes.filter(v => v.x !== (x + d.x) && v.y !== (y + d.y))[0];
                        yield { move: d.move, node: getCachedNeighbor(Tile.Hole, otherHole.x, otherHole.y) };
                        break;
                    default:
                        if (x !== origin.x || y !== origin.y) {
                            yield { move: d.move, node: getCachedNeighbor(this.cellAt(x, y), x, y) };
                        }
                        break;
                }
            }
        }.bind(this);

        const q = new FIFOQueue([this.#rootNode]);
        let iterations = 0;
        while (q.isNotEmpty()) {
            const currentNode = q.dequeue();
            for (const adjacent of neighbors(currentNode)) {
                ++iterations;
                if (adjacent.node.isExit()) {
                    adjacent.node.parent = currentNode;
                    adjacent.node.move = adjacent.move;
                    return [adjacent.node, iterations];
                }
                if (!adjacent.node.explored) {
                    adjacent.node.parent = currentNode;
                    adjacent.node.move = adjacent.move;
                    adjacent.node.explored = true;
                    q.enqueue(adjacent.node);
                }
            }
        }
        return [null, iterations];
    }
};

