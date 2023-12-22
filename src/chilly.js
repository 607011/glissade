/* Copyright (c) 2023 Oliver Lau <oliver@ersatzworld.net> */

import('./queue.js');
import('./graph.js')


// JavaScript's Set is such a shitty implementation of sets :-/
function setsAreEqual(A, B) {
    return A.size === B.size && [...A].every(x => B.has(x));
}

class ChillySolver {
    static DIRECTIONS = {
        U: { x: 0, y: -1, move: 'U' },
        D: { x: 0, y: +1, move: 'D' },
        L: { x: -1, y: 0, move: 'L' },
        R: { x: +1, y: 0, move: 'R' },
    };

    #levelData;
    #levelWidth;
    #levelHeight;
    #connections;
    #collectibles;
    #startNode;
    #exitNode;
    #nodes;
    #accessibleNodes;

    /**
     * @param {Array} levelData
     */
    constructor(level) {
        this.#connections = level.connections;
        this.#levelData = [...level.data];
        this.#levelHeight = this.#levelData.length;
        this.#levelWidth = this.#levelData[0].length;
        this.#collectibles = {};
        this.#startNode = null;
        this.#exitNode = null;
        this.#nodes = {};
        this.#accessibleNodes = {};

        for (let y = 0; y < this.#levelHeight; ++y) {
            const row = this.row(y);
            for (let x = 0; x < this.#levelWidth; ++x) {
                const id = row[x];
                this.#nodes[`${x},${y}`] = new GraphNode(id, x, y);
                switch (id) {
                    case Tile.Player:
                        this.#levelData[y] = row.replace(Tile.Player, Tile.Ice);
                        this.#startNode = this.#nodes[`${x},${y}`];
                        break;
                    case Tile.Exit:
                        this.#exitNode = this.#nodes[`${x},${y}`];
                        break;
                    case Tile.Coin:
                    // fall-through
                    case Tile.Gold:
                        this.#collectibles[`${x},${y}`] = this.#nodes[`${x},${y}`];
                        break;
                    default:
                        break;
                }
            }
        }

        this.#accessibleNodes = this.findAccessibleNodes();
    }

    #norm_x(x) {
        return (x + this.#levelWidth) % this.#levelWidth;
    }

    #norm_y(y) {
        return (y + this.#levelHeight) % this.#levelHeight;
    }

    row(y) {
        return this.#levelData[this.#norm_y(y)];
    }

    get levelData() {
        return this.#levelData;
    }

    get start() {
        return this.#startNode;
    }

    get exit() {
        return this.#exitNode;
    }

    collectibleAt(x, y) {
        return this.#collectibles[`${this.#norm_x(x)},${this.#norm_y(y)}`];
    }

    cellAt(x, y) {
        return this.#levelData[this.#norm_y(y)][this.#norm_x(x)];
    }

    nodeAt(x, y) {
        return this.#nodes[`${this.#norm_x(x)},${this.#norm_y(y)}`];
    }

    hasCollectibles() {
        return Object.keys(this.#collectibles).length > 0;
    }

    get nodeCount() {
        return Object.keys(this.#nodes).length;
    }

    get allNodes() {
        return this.#nodes;
    }

    get accessibleNodes() {
        return this.#accessibleNodes;
    }

    /**
     * 
     * @param {GraphNode} currentNode 
     * @returns Generator<{ move: string; node: GraphNode; } void, unknown>
     */
    *neighborsOf(currentNode) {
        // TODO: cache already explored neighbors

        // iterate over all neighbors of the current node
        for (const [move, d] of Object.entries(ChillySolver.DIRECTIONS)) {
            // console.debug(`    Trying to go ${move} from ${currentNode.x},${currentNode.y}...`)
            let { x, y } = currentNode;
            const dx = d.x;
            const dy = d.y;
            let xStep = 0;
            let yStep = 0;
            let collected = new Set();
            try {
                while ([Tile.Ice, Tile.Coin, Tile.Gold, Tile.Marker, Tile.Empty].includes(this.cellAt(x + dx, y + dy))) {
                    x += dx;
                    y += dy;
                    if ([Tile.Coin, Tile.Gold].includes(this.cellAt(x, y))) {
                        collected.add(this.collectibleAt(x, y));
                    }
                    xStep += dx;
                    yStep += dy;
                    if (Math.abs(xStep) > this.#levelWidth || Math.abs(yStep) > this.#levelHeight)
                        return;
                }
            }
            catch (e) {
                if (e instanceof TypeError)
                    throw new Error(`Probable loop detected in level while inspecting neighborhood of tile at ${this.#norm_x(x)}, ${this.#norm_y(y)}.`);
                return;
            }
            const stopTile = this.cellAt(x + dx, y + dy);
            let node = null;
            switch (stopTile) {
                case Tile.Exit:
                    node = this.nodeAt(x + dx, y + dy);
                    break;
                case Tile.Hole:
                    const otherHole = this.#connections.find(conn => conn.src.x === this.#norm_x(x + dx) && conn.src.y === this.#norm_y(y + dy)).dst;
                    node = this.nodeAt(otherHole.x, otherHole.y);
                    break;
                default:
                    if (x !== currentNode.x || y !== currentNode.y) {
                        node = this.nodeAt(x, y);
                    };
                    break;
            }
            if (node !== null) {
                yield { move, node, collected };
            }
        }
    }

    async shortestPathAB(A, B, callback) {
        if (A === null || B === null)
            return [null, 0];

        this.unexploreAll();

        const q = new FIFOQueue([A]);
        A.explored = true;
        let iterations = 0;
        if (typeof callback === 'function') {
            await callback(A, undefined, null);
        }
        while (q.isNotEmpty()) {
            const currentNode = q.dequeue();
            // for (const adjacent of this.neighborsOf(currentNode)) {
            for (const adjacent of currentNode.neighbors) {
                ++iterations;
                if (typeof callback === 'function') {
                    await callback(adjacent.node, adjacent.move, currentNode);
                }
                if (adjacent.node === B) {
                    adjacent.node.addMove(currentNode, adjacent.move);
                    return [adjacent.node, iterations];
                }
                if (!adjacent.node.explored) {
                    adjacent.node.addMove(currentNode, adjacent.move);
                    adjacent.node.explored = true;
                    q.enqueue(adjacent.node);
                }
            }
        }
        return [null, iterations];
    }


    async shortestPath(callback) {
        return await this.shortestPathAB(this.#startNode, this.#exitNode, callback);
    }

    unexploreAll() {
        Object.values(this.#nodes).forEach(entry => {
            entry.explored = false;
            entry.clearMoves();
        });
    }

    /**
     * Find all fields in game that can be visited or contain a collectible item.
     * 
     * This is done by a depth-first traversal.
     * 
     * @returns Array of `GraphNode`s
     */
    findAccessibleNodes() {
        if (this.#startNode === null)
            return;

        this.unexploreAll();

        let nodes = [];

        const DFS_explore = function (currentNode) {
            if (!currentNode.hasNeighbors()) {
                currentNode.neighbors = [...this.neighborsOf(currentNode)];
            }
            if (!currentNode.hasNeighbors() || currentNode.neighbors.every(node => node.explored)) {
                return;
            }
            for (const adjacent of currentNode.neighbors) {
                if (!adjacent.node.explored && !adjacent.node.isExit()) {
                    adjacent.node.explored = true;
                    nodes.push(adjacent.node);
                    DFS_explore(adjacent.node);
                }
            }
        }.bind(this);

        DFS_explore(this.#startNode);

        return nodes;
    }

}
