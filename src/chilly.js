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

function* allPermutations(arr) {
    const c = new Array(arr.length).fill(0);
    let i = 1;
    while (i < arr.length) {
        if (c[i] < i) {
            yield [...arr];
            const k = i % 2 && c[i];
            [arr[i], arr[k]] = [arr[k], arr[i]];
            ++c[i];
            i = 1;
        }
        else {
            c[i] = 0;
            ++i;
        }
    }
}


class GraphNode {
    #id;
    #x;
    #y;
    #explored;
    #parent;
    #neighbors;
    #edges;
    #index;

    constructor(id, x, y, explored = false) {
        this.#id = id;
        this.#x = x;
        this.#y = y;
        this.#explored = explored;
        this.#parent = null;
        this.#neighbors = undefined;
        this.#edges = [];
        this.#index = undefined;
    }
    equals(other) {
        return this.#x === other.x && this.#y === other.y;
    }
    get neighbors() {
        return this.#neighbors;
    }
    set neighbors(n) {
        this.#neighbors = n;
    }
    get edges() {
        return this.#edges;
    }
    set edges(e) {
        this.#edges = e;
    }
    get index() {
        return this.#index;
    }
    set index(index) {
        this.#index = index;
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
    isStart() {
        return this.#id === Tile.Player;
    }
    isExit() {
        return this.#id === Tile.Exit;
    }
    isCollectible() {
        return this.#id === Tile.Coin || this.#id === Tile.Gold;
    }
}


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

    constructor(U, V, weight, move) {
        this.#U = U;
        this.#V = V;
        this.#weight = weight;
        this.#move = move;
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
}


class NodeSet {
    #data;
    constructor() {
        this.#data = {};
    }

    contains(node) {
        typeof this.#data[`${node.x},${node.y}`] !== 'undefined';
    }

    add(node) {
        if (!this.contains(node)) {
            this.#data[`${node.x},${node.y}`] = node;
        }
    }
}

class ChillySolver {

    static DIRECTIONS = [
        { x: 0, y: -1, move: 'U' },
        { x: 0, y: +1, move: 'D' },
        { x: -1, y: 0, move: 'L' },
        { x: +1, y: 0, move: 'R' }
    ];

    #levelData;
    #levelWidth;
    #levelHeight;
    #connections;
    #collectibles;
    #rootNode;
    #nodeCache;
    #edgeCache;
    #distanceMatrix;

    /**
     * @param {Array} levelData
     */
    constructor(level) {
        this.#connections = level.connections;
        this.#levelData = [...level.data];
        this.#levelHeight = this.#levelData.length;
        this.#levelWidth = this.#levelData[0].length;
        this.#collectibles = [];
        this.#rootNode = null;
        this.#nodeCache = {};
        this.#edgeCache = {};
        this.#distanceMatrix = [];
        for (let y = 0; y < this.#levelHeight; ++y) {
            const row = this.row(y);
            for (let x = 0; x < this.#levelWidth; ++x) {
                switch (row[x]) {
                    case Tile.Player:
                        this.#levelData[y] = row.replace(Tile.Player, Tile.Ice);
                        this.#rootNode = new GraphNode(Tile.Player, x, y, true);
                        break;
                    case Tile.Coin:
                    // fall-through
                    case Tile.Gold:
                        this.#collectibles.push({ x, y });
                        break;
                    default:
                        break;
                }
            }
        }
    }

    row(y) {
        return this.#levelData[(y + this.#levelHeight) % this.#levelHeight];
    }

    cellAt(x, y) {
        return this.#levelData[(y + this.#levelHeight) % this.#levelHeight][(x + this.#levelWidth) % this.#levelWidth];
    }

    get nodeCount() {
        return Object.keys(this.#nodeCache).length;
    }

    get edges() {
        return this.#edgeCache;
    }

    /**
     * 
     * @param {number} id 
     * @param {number} x 
     * @param {number} y 
     * @param {boolean} explored 
     * @returns GraphNode
     */
    #addToNodeCache(id, x, y, explored = false) {
        const node = new GraphNode(id, x, y, explored);
        this.#nodeCache[`${x},${y}`] = node;
        return node;
    }

    /**
     * 
     * @param {number} id 
     * @param {number} x 
     * @param {number} y 
     * @param {boolean} explored 
     * @returns GraphNode
     */
    #getCachedNode(id, x, y, explored = false) {
        x = (x + this.#levelWidth) % this.#levelWidth;
        y = (y + this.#levelHeight) % this.#levelHeight;
        let node = this.#nodeCache[`${x},${y}`];
        if (!node) {
            node = this.#addToNodeCache(id, x, y, explored);
        }
        return node;
    }

    /**
     * 
     * @param {GraphNode} U 
     * @param {GraphNode} V 
     * @param {number} weight 
     * @returns GraphEdge
     */
    #addToEdgeCache(U, V, weight) {
        const edge = new GraphEdge(U, V, weight);
        this.#edgeCache[`${U.x},${U.y} ${V.x},${V.y}`] = edge;
        return edge;
    }

    /**
     * 
     * @param {GraphNode} U 
     * @param {GraphNode} V 
     * @returns GraphEdge
     */
    #getEdge(U, V) {
        return this.#edgeCache[`${U.x},${U.y} ${V.x},${V.y}`];
    }

    /**
     * 
     * @param {GraphNode} U 
     * @param {GraphNode} V
     * @returns GraphEdge
     */
    #cacheEdge(U, V, weight) {
        let edge = this.#getEdge(U, V);
        if (!edge) {
            edge = this.#addToEdgeCache(U, V, weight);
        }
        return edge;
    }

    #norm_x(x) {
        return (x + this.#levelWidth) % this.#levelWidth;
    }

    #norm_y(y) {
        return (y + this.#levelHeight) % this.#levelHeight;
    }

    /**
     * 
     * @param {GraphNode} source 
     * @returns Generator<{ move: string; node: GraphNode; } void, unknown>
     */
    *neighborsOf(source) {
        // iterate over all neighbors of the current node
        for (const d of ChillySolver.DIRECTIONS) {
            let { x, y } = source;
            const dx = d.x;
            const dy = d.y;
            const move = d.move;
            let xStep = 0;
            let yStep = 0;
            let prevNode = source;
            while ([Tile.Ice, Tile.Coin, Tile.Gold, Tile.Marker, Tile.Empty].includes(this.cellAt(x + dx, y + dy))) {
                x += dx;
                y += dy;
                if ([Tile.Coin, Tile.Gold].includes(this.cellAt(x, y))) {
                    const collectible = this.#getCachedNode(this.cellAt(x, y), x, y);
                    yield { move, node: collectible };
                    const nextTile = this.cellAt(x + dx, y + dy);
                    this.#cacheEdge(prevNode, collectible, nextTile === Tile.Rock ? 1 : 0);
                    prevNode = collectible;
                }
                xStep += dx;
                yStep += dy;
                if (Math.abs(xStep) > this.#levelWidth || Math.abs(yStep) > this.#levelHeight)
                    return;
            }
            const stopTile = this.cellAt(x + dx, y + dy);
            let node = null;
            switch (stopTile) {
                case Tile.Exit:
                    node = this.#getCachedNode(Tile.Exit, x + dx, y + dy);
                    break;
                case Tile.Hole:
                    const otherHole = this.#connections.find(conn => conn.src.x === this.#norm_x(x + dx) && conn.src.y === this.#norm_y(y + dy)).dst;
                    node = this.#getCachedNode(Tile.Hole, otherHole.x, otherHole.y, false);
                    break;
                default:
                    if (x !== source.x || y !== source.y) {
                        node = this.#getCachedNode(this.cellAt(x, y), x, y, false);
                    };
                    break;
            }
            if (node !== null) {
                if (!node.isCollectible()) {
                    this.#cacheEdge(prevNode, node, 1);
                }
                yield { move, node };
            }
        }
    }


    /**
     * 
     * @param {GraphNode} source 
     * @returns [GraphEdge]
     */
    #edgesFrom(source) {
        let edges = [];
        for (const d of ChillySolver.DIRECTIONS) {
            let { x, y } = source;
            const dx = d.x;
            const dy = d.y;
            const move = d.move;
            let xStep = 0;
            let yStep = 0;
            let prevNode = source;
            while ([Tile.Ice, Tile.Coin, Tile.Gold, Tile.Marker, Tile.Empty].includes(this.cellAt(x + dx, y + dy))) {
                x += dx;
                y += dy;
                if ([Tile.Coin, Tile.Gold].includes(this.cellAt(x, y))) {
                    const collectible = this.#getCachedNode(this.cellAt(x, y), x, y);
                    edges.push(new GraphEdge(prevNode, collectible, nextTile === Tile.Rock ? 1 : 0));
                    // TODO: slide on until stop
                    const nextTile = this.cellAt(x + dx, y + dy);
                    prevNode = collectible;
                }
                xStep += dx;
                yStep += dy;
                if (Math.abs(xStep) > this.#levelWidth || Math.abs(yStep) > this.#levelHeight)
                    return;
            }
            const stopTile = this.cellAt(x + dx, y + dy);
            let node = null;
            switch (stopTile) {
                case Tile.Exit:
                    node = this.#getCachedNode(Tile.Exit, x + dx, y + dy);
                    break;
                case Tile.Hole:
                    const otherHole = this.#connections.find(conn => conn.src.x === (x + dx) && conn.src.y === (y + dy));
                    node = this.#getCachedNode(Tile.Hole, otherHole.dst.x, otherHole.dst.y, false);
                    break;
                default:
                    if (x !== source.x || y !== source.y) {
                        node = this.#getCachedNode(this.cellAt(x, y), x, y, false);
                    };
                    break;
            }
            if (node !== null) {
                edges.push(new GraphEdge(prevNode, node, 1, move));
            }
        }
        return edges;
    }


    static MaxBacktracerSteps = 20;
    static backTrace(node, startNode) {
        let iterations = 0;
        let path = [];
        while (node !== startNode && (++iterations < 10_000)) {
            if (node !== null) {
                path.unshift(node);
            }
            else {
                break;
            }
            node = node.parent;
        }
        return path;
    }

    buildGraph() {
        if (this.#rootNode === null)
            return;
        this.#nodeCache = { [`${this.#rootNode.x},${this.#rootNode.y}`]: this.#rootNode };

        // TODO !!!
    }

    /**
     * Find all fields in game that can be visited or contain a collectible item.
     * 
     * This is done by a depth-first traversal.
     * 
     * @returns Array of `GraphNode`s
     */
    findNodes() {
        if (this.#rootNode === null)
            return;

        this.#nodeCache = { [`${this.#rootNode.x},${this.#rootNode.y}`]: this.#rootNode };

        const DFS_explore = function (currentNode) {
            if (!currentNode.neighbors) {
                currentNode.neighbors = [...this.neighborsOf(currentNode)];
            }
            if (currentNode.neighbors.length === 0 || currentNode.neighbors.every(node => node.explored)) {
                return;
            }
            for (const adjacent of currentNode.neighbors) {
                if (!adjacent.node.explored && !adjacent.node.isExit()) {
                    adjacent.node.explored = true;
                    DFS_explore(adjacent.node);
                }
            }
        }.bind(this);

        DFS_explore(this.#rootNode);

        return Object.values(this.#nodeCache);
    }

    solveAB(a, b) {
        if (a === b)
            return null;

        a = new GraphNode(a.id, a.x, a.y, true);
        b = new GraphNode(b.id, b.x, b.y, false);

        this.#nodeCache = { [`${a.x},${a.y}`]: a };
        // console.debug(`solveAB(${a.x},${a.y} -> ${b.x},${b.y})`);
        const q = new FIFOQueue([a]);
        while (q.isNotEmpty()) {
            const currentNode = q.dequeue();
            if (!currentNode.neighbors) {
                currentNode.neighbors = [...this.neighborsOf(currentNode)];
                //console.debug(currentNode.neighbors);
            }
            for (const adjacent of currentNode.neighbors) {
                if (adjacent.node.equals(b)) {
                    adjacent.node.parent = currentNode;
                    adjacent.node.move = adjacent.move;
                    return adjacent.node;
                }
                if (!adjacent.node.explored) {
                    adjacent.node.parent = currentNode;
                    adjacent.node.move = adjacent.move;
                    adjacent.node.explored = true;
                    q.enqueue(adjacent.node);
                }
            }
        }
        return null;
    }

    #nodesWithIndex() {
        const nodes = Object.values(this.#nodeCache);
        for (let i = 0; i < nodes.length; ++i) {
            nodes[i].index = i;
        }
        return nodes;
    }

    async dijkstra2D() {
        if (this.#rootNode === null)
            return;

        const [nodes, startIdx, finishIdx] = await this.calcDistanceMatrix();
        console.debug(this.#distanceMatrix);

        let source = nodes[startIdx]; //nodes.find(node => node.isStart());
        let destination = nodes[finishIdx]; // nodes.find(node => node.isExit());
        let prev = [...Array(nodes.length).fill(null)];
        let mustVisitNodes = nodes.filter(node => node.isCollectible());

        console.debug('source =', source);
        console.debug('destination =', destination);
        console.debug('mustVisitNodes =', mustVisitNodes);

        let q = new PriorityQueue;
        q.enqueue({
            node: source,
            cost: 0,
            bitmask: 0,
        });
        let distance = [...Array(nodes.length)].map(_ => Array(1 << mustVisitNodes.length).fill(Number.POSITIVE_INFINITY));
        distance[source.index][0] = 0;
        while (q.isNotEmpty()) {
            const u = q.dequeue();
            if (!u.node.neighbors) {
                continue;
            }
            if (u.cost !== distance[u.node.index][u.bitmask])
                continue;
            for (const v of u.node.neighbors) {
                let newBitmask = u.bitmask;
                const vid = mustVisitNodes.findIndex(node => node === v.node);
                if (vid >= 0) {
                    newBitmask = u.bitmask | (1 << vid);
                }
                const newEdgeCost = this.#distanceMatrix[u.node.index][v.node.index];
                console.debug(`${u.node.x},${u.node.y} ${v.node.x},${v.node.y} => ${newEdgeCost}`);
                const newCost = u.cost + newEdgeCost;
                if (newCost < distance[v.node.index][newBitmask]) {
                    distance[v.node.index][newBitmask] = newCost;
                    prev[v.node.index] = u.node;
                }
                q.enqueue({
                    node: v.node,
                    cost: newCost,
                    bitmask: newBitmask,
                });
            }
        }

        console.debug(distance[destination.index]);

        console.debug(prev);

        // construct route from predecessor array
        let u = destination;
        let route = [];
        let iterations = 0;
        while (u !== null) {
            route.unshift(u);
            console.log(u.index);
            u = prev[u.index];
            if (iterations++ > prev.length) {
                console.debug(route);
                throw new Error('Too many iterations');
            }
        }
        return [source, destination, route];
    }

    async shortestPath(callback) {
        if (this.#rootNode === null)
            return [null, 0];

        this.#nodeCache = { [`${this.#rootNode.x},${this.#rootNode.y}`]: this.#rootNode };

        const q = new FIFOQueue([this.#rootNode]);
        let iterations = 0;
        if (typeof callback === 'function') {
            await callback(this.#rootNode, undefined, null);
        }
        while (q.isNotEmpty()) {
            const currentNode = q.dequeue();
            for (const adjacent of this.neighborsOf(currentNode)) {
                ++iterations;
                if (typeof callback === 'function') {
                    await callback(adjacent.node, adjacent.move, currentNode);
                }
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



    async calcDistanceMatrix() {
        const nodes = this.#nodesWithIndex();
        const N = nodes.length;
        this.#distanceMatrix = [...Array(N + 1)].map(e => Array(N + 1).fill(Number.POSITIVE_INFINITY));

        // TODO: add dummy node with 0 distance to start and finish and infinite distance to all other nodes
        const startIdx = nodes.findIndex(tile => tile.id === Tile.Player);
        const finishIdx = nodes.findIndex(tile => tile.id === Tile.Exit);
        this.#distanceMatrix[startIdx][N] = 0;
        this.#distanceMatrix[finishIdx][N] = 0;
        this.#distanceMatrix[N][startIdx] = 0;
        this.#distanceMatrix[N][finishIdx] = 0;
        for (let i = 0; i < N; ++i) {
            const a = nodes[i];
            for (let j = 0; j < N; ++j) {
                if (i === j) {
                    this.#distanceMatrix[i][j] = 0;
                    continue;
                }
                const b = nodes[j];
                // console.debug(`solve(${a.x},${a.y} -> ${b.x},${b.y})`);
                const solver = new ChillySolver([...this.#levelData]);
                const dstNode = solver.solveAB(a, b);
                if (dstNode && dstNode.equals(b)) {
                    const path = ChillySolver.backTrace(dstNode, a);
                    // TODO: only add path if collectibles are collected along the path
                    console.debug(i, j, `from ${a.x},${a.y} to ${b.x},${b.y}`, path);
                    if (path.length > 1) {
                        this.#distanceMatrix[i][j] = path.length - 1;
                    }
                }
            }
        }
        return [nodes, startIdx, finishIdx];
    }

};

