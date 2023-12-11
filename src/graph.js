class Tile {
    static Size = 32;
    static Empty = ' ';
    static Ice = ' ';
    static Marker = '.';
    static Rock = '#';
    static Flower = 'Y';
    static Tree = 'T';
    static Exit = 'X';
    static Player = 'P';
    static Coin = '$';
    static Gold = 'G';
    static Hole = 'O';
};

class GraphNode {
    #id;
    #x;
    #y;
    #explored;
    #neighbors;
    #moves;
    #index;
    #toCollect;

    constructor(id, x, y, explored = false) {
        this.#id = id;
        this.#x = x;
        this.#y = y;
        this.#explored = explored;
        this.#neighbors = [];
        this.#moves = [];
        this.#index = undefined;
        this.#toCollect = new Set();
    }
    cloned() {
        return new GraphNode(this.id, this.x, this.y);
    }
    equals(other) {
        return this.#x === other.x && this.#y === other.y;
    }
    get toCollect() {
        return this.#toCollect;
    }
    set toCollect(toCollect) {
        this.#toCollect = toCollect;
    }
    deleteCollectible(collectible) {
        
    }
    get index() {
        return this.#index;
    }
    set index(index) {
        this.#index = index;
    }
    set neighbors(neighbors) {
        this.#neighbors = neighbors;
    }    
    get neighbors() {
        return this.#neighbors;
    }
    hasNeighbors() {
        return this.#neighbors.length > 0;
    }
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
    get id() {
        return this.#id;
    }
    addMove(parent, move) {
        // console.debug(`addMove(${parent.x},${parent.y}→${move})`);
        this.#moves.push({ parent, move });
    }
    nextMove() {
        return this.#moves.shift();
    }
    hasMoves() {
        return this.#moves.length > 0;
    }
    clearMoves() {
        this.#moves = [];
    }
    isHole() {
        return this.#id === Tile.Hole;
    }
    isStart() {
        return this.#id === Tile.Player;
    }
    isExit() {
        return this.#id === Tile.Exit;
    }
    isCollectible() {
        return this.#id === Tile.Coin || this.#id === Tile.Gold;
    }

    toJSON() {
        return {
            id: this.#id,
            x: this.#x,
            y: this.#y,
            moves: Object.values(this.#moves).map(move => move.move).join(''),
            neighbors: this.#neighbors.map(neighbor => `${neighbor.x},${neighbor.y}`).join('; ')
        };
    }
}


class NodeSet {
    #data;

    constructor() {
        this.#data = {};
    }

    has(node) {
        return typeof this.#data[`${node.x},${node.y}`] !== 'undefined';
    }

    add(node) {
        if (!this.has(node)) {
            this.#data[`${node.x},${node.y}`] = node;
        }
    }

    delete(node) {
        delete this.#data[`${node.x},${node.y}`];
    }

    equals(other) {
        return this.valueOf() === other.valueOf();
    }
}
