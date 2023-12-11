
class FIFOQueue {
    _data;
    constructor(data = []) {
        console.assert(data instanceof Array);
        this._data = data;
    }
    enqueue(item) {
        this._data.push(item);
    }
    dequeue() {
        if (this.isEmpty())
            throw new Error('Queue underflow');
        return this._data.shift();
    }
    front() {
        if (this.isEmpty())
            throw new Error('Queue underflow');
        return this._data[0];
    }
    back() {
        if (this.isEmpty())
            throw new Error('Queue underflow');
        return this._data[this._data.length - 1];
    }
    get data() {
        return this._data;
    }
    get length() {
        return this._data.length;
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

class GraphEdge {
    #U;
    #V;
    #weight;
    #move;
    #items;

    constructor(U, V, weight, move, items) {
        this.#U = U;
        this.#V = V;
        this.#weight = weight;
        this.#move = move;
        this.#items = items;
    }

    get U() {
        return this.#U;
    }

    get V() {
        return this.#V;
    }

    get weight() {
        return this.#weight;
    }

    get move() {
        return this.#move;
    }

    get items() {
        return this.#items;
    }

    toJSON() {
        return {
            U: this.U,
            V: this.V,
            weight: this.weight,
            move: this.move,
            items: this.items,
        };
    }
}

let board = [
    "##############",
    "#$#  $ T    P#",
    "#    #     # #",
    "#     T      #",
    "#     $      #",
    "#        #   #",
    "# # $     #  #",
    "#      #     #",
    "#  #       $ #",
    "#T $      #  #",
    "#      T     #",
    "#   T        #",
    "#$  #     #  #",
    "######X#######"
];

const ACCESSIBLES = [" ", "$", "P", "X"];
const BLOCK = ["#", "T"];
const DIRECTIONS = {
    L: { x: -1, y: 0 },
    R: { x: +1, y: 0 },
    U: { x: 0, y: -1 },
    D: { x: 0, y: +1 }
};

class ChillySolver {
    constructor(board) {
        this.board = board;
        this.start = null;
        this.exit = null;
        this.accessible = {};
        this.edges = {}
        this.numRows = this.board.length;
        this.numCols = board[0].length;
        this.max_range = Math.max(this.numRows, this.numCols);
        this.parse();
        this.buildGraph();
    }

    parse() {
        for (let y = 0; y < this.board.length; ++y) {
            const row = this.board[y];
            for (let x = 0; x < row.length; ++x) {
                const field = row[x];
                if (field === "P") {
                    this.start = { row: y, col: x };
                }
                else if (field === "X") {
                    this.exit = { row: y, col: x };
                }
                if (ACCESSIBLES.includes(field)) {
                    this.accessible[`${x},${y}`] = { row: y, col: x, field };
                }
            }
        }
    }

    buildGraph() {
        this.edges = {};
        let not_visited = [this.start]
        while (not_visited.length > 0) {
            const U = not_visited.shift();
            const { row, col } = U;
            for (const [direction, d] of Object.entries(DIRECTIONS)) {
                let collected = [];
                for (let distance = 1; distance < this.max_range; ++distance) {
                    const dst = {
                        col: col + d.x * distance,
                        row: row + d.y * distance,
                    }
                    if (`${dst.col},${dst.row}` in this.accessible) {
                        if (this.accessible[`${dst.col},${dst.row}`].field === "$") {
                            collected.push({ x: dst.col, y: dst.row });
                        }
                        continue;
                    }
                    const V = { row: dst.row - d.y, col: dst.col - d.x };
                    if (`${U.col},${U.row}-${V.col},${V.row}` in this.edges)
                        break;
                    if (distance > 1) {
                        this.edges[`${U.col},${U.row}-${V.col},${V.row}`] = new GraphEdge(U, V, distance - 1, direction, collected);
                        not_visited.push(V);
                    }
                    break;
                }
            }
        }
    }

    shortestPath() {
        const distance_matrix = [...new Array(this.numRows)].map(() => new Array(this.numCols).fill(Infinity));
        const visited = [...new Array(this.numRows)].map(() => new Array(this.numCols).fill(false));
        const path = [...new Array(this.numRows)].map(() => new Array(this.numCols).fill(null));
        const queue = [];
        queue.push(this.start);
        this.start.predecessor = null;
        distance_matrix[this.start.row][this.start.col] = 0;
        while (queue.length > 0) {
            const current = queue.shift();
            console.debug(current);
            if (current.row === this.exit.row && current.col === this.exit.col) {
                const shortestPath = [];
                let field = current;
                while (field) {
                    shortestPath.unshift(field);
                    field = path[field.row][field.col];
                }
                return shortestPath;
            }
            
        }
        return null;
    }
}


let solver = new ChillySolver(board);

for (const [key, edge] of Object.entries(solver.edges)) {
    console.debug(key, edge.U, edge.V, edge.weight, edge.move, edge.items);
}

const path = solver.shortestPath();
console.debug(path);


// function shortestPath(board, start, exit) {
//     const numRows = board.length;
//     const numCols = board[0].length;
//     const MAX_RANGE = Math.max(numRows, numCols);
//     }

//     // console.debug(distance_matrix)

//     // If no path is found, return null
//     return null;
// }

// const result = shortestPath(level, start, exit);
// console.log(result);

// const MAX_RANGE = Math.max(level.length, level[0].length);


// for (const [key, edge] of Object.entries(edges)) {
//     console.log(key, edge.U, edge.V, edge.weight, edge.items);
// }

// console.log(JSON.stringify(edges));

// console.debug(accessible);
