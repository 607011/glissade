/*
    Copyright (c) 2023 Oliver Lau

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

import("./graph.js");
import("./chilly.js");

(function (window) {
    "use strict";

    class State {
        static Default = 1;
        static Connecting = 2;
    }
    class Undoable {
        constructor(undoFunc) {
            this.undo = undoFunc;
        }
    }
    class UndoHistory {
        constructor(maxSteps = 500) {
            this.maxSteps = maxSteps;
            this.history = [];
        }
        add(undoable) {
            this.history.push(undoable);
            if (this.history.length > this.maxSteps) {
                this.history.shift();
            }
        }
        undo() {
            if (this.history.length === 0)
                return;
            this.history.pop().undo();
        }
    }
    const STORAGE_KEY_LEVEL = 'rutschpartie.level';
    const STORAGE_KEY_WIDTH = 'rutschpartie.width';
    const STORAGE_KEY_HEIGHT = 'rutschpartie.height';
    const STORAGE_KEY_NAME = 'rutschpartie.name';
    const STORAGE_KEY_ITEM = 'rutschpartie.item';
    const el = {};
    let selectedItem = localStorage.getItem(STORAGE_KEY_ITEM) || 'rock';
    let state = State.Default;
    let undoHistory = new UndoHistory;
    let level = {
        data: null,
        connections: [],
        connectionData: () => console.error('level.connectionData() not properly implemented'),
    };
    let width;
    let height;
    let hole1;
    let A = null, B = null;
    let currentPos;
    let connectionLine;
    let selectedConnectionLine = null;
    function cellAt(x, y) {
        return level.data[y | 0][x | 0];
    }
    function upscaled(coord) {
        return (coord | 0) * Tile.Size + Tile.Size / 2;
    }
    function setSelectedItem(item) {
        selectedItem = item;
        localStorage.setItem(STORAGE_KEY_ITEM, item);
    }

    async function solveAB(A, B) {
        el.game.querySelectorAll('.hint').forEach(el => el.remove());
        console.debug('solveToHere()')
        const solver = new ChillySolver({
            data: level.data,
            connections: level.connectionData()
        });
        let solverResult;
        el.message.textContent = '';
        try {
            const sourceNode = solver.nodeAt(A.x, A.y);
            const targetNode = solver.nodeAt(B.x, B.y);
            solverResult = await solver.shortestPathAB(sourceNode, targetNode);
        }
        catch (e) {
            el.path.textContent = e.message;
        }
        if (!solverResult) {
            el.message.textContent = '<unsolvable>';
            el.path.textContent = '';
            return;
        }
        let [node, _iterations] = solverResult;
        if (node === null) {
            el.message.textContent = '<no solutions>';
            el.path.textContent = '';
            return;
        }
        // backtrace path from destination node
        let path = [node];

        while (node.hasMoves() && !node.isStart()) {
            const move = node.nextMove();
            node = move.parent;
            path.unshift(move);
        }

        console.debug(path)

        const moves = [];
        const HINT_NAMES = { 'U': 'hint-up', 'R': 'hint-right', 'D': 'hint-down', 'L': 'hint-left' };
        for (const move of path) {
            moves.push(node.move);
            if (move.parent) {
                const { x, y } = move.parent;
                const hint = document.createElement('div');
                hint.className = `tile hint ${HINT_NAMES[move.move]}`;
                el.game.querySelector(`[data-coord="${x}-${y}"]`).appendChild(hint);
            }
        }

        return path;
    }

    async function solve() {
        el.game.querySelectorAll('.hint').forEach(el => el.remove());
        const solver = new ChillySolver({
            data: level.data,
            connections: level.connectionData()
        });
        let solverResult;
        el.message.textContent = '';
        try {
            solverResult = await solver.shortestPath();
        }
        catch (e) {
            el.message.textContent = e.message;
        }
        if (!solverResult) {
            el.message.textContent = '<unsolvable>';
            el.path.textContent = '';
            return;
        }
        let [node, iterations] = solverResult;
        if (node === null) {
            el.message.textContent = '<no solutions>';
            el.path.textContent = '';
            return;
        }
        // backtrace path from destination node
        let path = [node];

        while (node.hasMoves() && !node.isStart()) {
            const move = node.nextMove();
            node = move.parent;
            path.unshift(move);
        }

        const moves = [];
        const HINT_NAMES = { 'U': 'hint-up', 'R': 'hint-right', 'D': 'hint-down', 'L': 'hint-left' };
        for (const move of path) {
            moves.push(node.move);
            if (move.parent) {
                const { x, y } = move.parent;
                const hint = document.createElement('div');
                hint.className = `tile hint ${HINT_NAMES[move.move]}`;
                el.game.querySelector(`[data-coord="${x}-${y}"]`).appendChild(hint);
            }
        }
        el.path.textContent = `${moves.length}: ${moves.join('')} (${iterations} iterations)`;
        el.points.value = Math.round(iterations / 10);
        el.threshold1.value = moves.length;
        el.threshold2.value = moves.length + 1;
        el.threshold3.value = Math.round(moves.length * 1.4);
    }

    function checkForProblems() {
        let problems = [];
        // check if all connections begin and end at holes
        for (const conn of level.connections) {
            const x0 = conn.src.getAttribute('data-x');
            const y0 = conn.src.getAttribute('data-y');
            if (cellAt(x0, y0) !== Tile.Hole) {
                problems.push(`Connection from ${x0},${y0} does not begin at hole`);
            }
            const x1 = conn.dst.getAttribute('data-x');
            const y1 = conn.dst.getAttribute('data-y');
            if (cellAt(x1, y1) !== Tile.Hole) {
                problems.push(`Connection to ${x1},${y1} does not end at hole`);
            }
        }
        // check if all holes have an incoming and outgoing connection
        for (let x = 0; x < width; ++x) {
            for (let y = 0; y < height; ++y) {
                if (cellAt(x, y) === Tile.Hole) {
                    if (!level.connections.find(conn => conn.src.getAttribute('data-x') == x && conn.src.getAttribute('data-y') == y)) {
                        problems.push(`Hole @ ${x},${y} has no outgoing connection`);
                    }
                    if (!level.connections.find(conn => conn.dst.getAttribute('data-x') == x && conn.dst.getAttribute('data-y') == y)) {
                        problems.push(`Hole @ ${x},${y} has no incoming connection`);
                    }
                }
            }
        }
        if (problems.length === 0) {
            el.problems.innerHTML = '<li>no problems</li>';
        }
        else {
            el.problems.textContent = '';
            for (const problem of problems) {
                const li = document.createElement('li');
                li.className = 'problem';
                li.textContent = problem;
                el.problems.appendChild(li);
            }
        }
    }
    function updateAll() {
        solve().then(() => {
            saveLevel();
            updatePlayButton();
            removeHash();
            checkForProblems();
        });
    }
    function undo() {
        undoHistory.undo();
    }
    function collectedLevelData() {
        return {
            data: level.data,
            connections: level.connectionData(),
            name: el.name.value,
        };
    }
    function saveLevel(rows) {
        if (rows instanceof Array) {
            level.data = rows;
        }
        localStorage.setItem(STORAGE_KEY_LEVEL, JSON.stringify(collectedLevelData()));
    }
    function updatePlayButton() {
        el.playButton.href = `index.html#level=${btoa(JSON.stringify(collectedLevelData()))}`;
    }
    function createConnectionLine(src, dst, addListeners = false) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'connection');
        line.setAttribute('data-x1', src.x);
        line.setAttribute('data-y1', src.y);
        line.setAttribute('data-x2', dst.x);
        line.setAttribute('data-y2', dst.y);
        line.setAttribute('x1', upscaled(src.x));
        line.setAttribute('y1', upscaled(src.y));
        line.setAttribute('x2', upscaled(dst.x));
        line.setAttribute('y2', upscaled(dst.y));
        if (addListeners) {
            addConnectionLineListeners(line);
        }
        return line;
    }
    function addConnectionLineListeners(line) {
        line.addEventListener('mouseout', _e => {
            selectedConnectionLine.classList.remove('hover');
            selectedConnectionLine = null;
        });
        line.addEventListener('mouseover', e => {
            selectedConnectionLine = e.target;
            selectedConnectionLine.classList.add('hover');
        });
        line.addEventListener('click', e => {
            console.debug(e.target);
        });
    }
    /**
     * Construct processable level data from scene.
     */
    function evaluateTiles() {
        let x = 0;
        let rows = [];
        let row = '';
        for (const tile of el.scene.children) {
            if (tile.classList.contains('rock')) {
                row += Tile.Rock;
            }
            else if (tile.classList.contains('tree')) {
                row += Tile.Tree;
            }
            else if (tile.classList.contains('flower')) {
                row += Tile.Flower;
            }
            else if (tile.classList.contains('empty')) {
                row += Tile.Empty;
            }
            else if (tile.classList.contains('penguin-standing')) {
                row += Tile.Player;
            }
            else if (tile.classList.contains('coin')) {
                row += Tile.Coin;
            }
            else if (tile.classList.contains('gold')) {
                row += Tile.Gold;
            }
            else if (tile.classList.contains('exit')) {
                row += Tile.Exit;
            }
            else if (tile.classList.contains('hole')) {
                row += Tile.Hole;
            }
            else if (tile.classList.contains('marker')) {
                row += Tile.Marker;
            }
            else {
                row += Tile.Ice;
            }
            if (++x === width) {
                rows.push(row);
                row = '';
                x = 0;
            }
        }
        saveLevel(rows);
    }
    /**
     * Create tiles for scene from level data.
     * This function is the counterpart to `evaluateTiles()`.
     * @returns List of tiles as `HTMLSpanElement`s
     */
    function generateTiles() {
        let tiles = [];
        for (let y = 0; y < level.data.length; ++y) {
            const row = level.data[y];
            for (let x = 0; x < row.length; ++x) {
                const item = row[x];
                const tile = document.createElement('span');
                tile.className = 'tile';
                tile.addEventListener('click', onTileClicked);
                tile.addEventListener('mouseenter', onTileEntered);
                tile.setAttribute('data-coord', `${x}-${y}`);
                tile.setAttribute('data-x', x);
                tile.setAttribute('data-y', y);
                switch (item) {
                    case Tile.Rock:
                        tile.classList.add('rock');
                        break;
                    case Tile.Tree:
                        tile.classList.add('tree');
                        break;
                    case Tile.Flower:
                        tile.classList.add('flower');
                        break;
                    case Tile.Empty:
                        tile.classList.add('empty');
                        break;
                    case Tile.Hole:
                        tile.classList.add('hole');
                        break;
                    case Tile.Coin:
                        tile.classList.add('coin');
                        break;
                    case Tile.Exit:
                        tile.classList.add('exit');
                        break;
                    case Tile.Player:
                        tile.classList.add('penguin-standing');
                        break;
                    case Tile.Marker:
                        tile.classList.add('marker');
                        break;
                    case Tile.Ice:
                        tile.classList.add('ice');
                        break;
                    default:
                        console.error(`Invalid tile @ ${x},${y}: ${item}`);
                        break;
                }
                tiles.push(tile);
            }
        }
        return tiles;
    }
    /**
     * Check if given HTML element is a hole with an outgoing connection.
     * @param {HTMLElement} element 
     * @returns true if given element has an outgoing connection, false otherwise
     */
    function holeIsSource(element) {
        return level.connections.some(conn => conn.src === element);
    }
    /**
     * Build and display scene from level data.
     */
    function build() {
        width = level.data[0].length;
        height = level.data.length;
        el.scene.style.gridTemplateColumns = `repeat(${width}, ${Tile.Size}px)`;
        el.scene.style.gridTemplateRows = `repeat(${height}, ${Tile.Size}px)`;
        el.scene.style.width = `${width * Tile.Size}px`;
        el.scene.style.height = `${height * Tile.Size}px`;
        const tiles = generateTiles();
        el.scene.replaceChildren(...tiles);
        el.connections.setAttribute('viewBox', `0 0 ${width * Tile.Size} ${height * Tile.Size}`);
        el.connections.setAttribute('width', `${width * Tile.Size}`);
        el.connections.setAttribute('height', `${height * Tile.Size}`);
        let connections = [];
        if (!level.connections) {
            level.connections = [];
        }
        if (level.connections instanceof Array) {
            for (const conn of level.connections) {
                const x1 = parseInt(conn.src.x);
                const y1 = parseInt(conn.src.y);
                const x2 = parseInt(conn.dst.x);
                const y2 = parseInt(conn.dst.y);
                const line = createConnectionLine({ x: x1, y: y1 }, { x: x2, y: y2 }, true);
                connections.push({
                    src: el.scene.querySelector(`[data-coord="${x1}-${y1}"]`),
                    dst: el.scene.querySelector(`[data-coord="${x2}-${y2}"]`),
                    line: line,
                });
                el.connections.appendChild(line);
            }
            level.connections = connections;
        }
        el.game.replaceChildren(el.scene);
    }
    /**
     * Convert all level data to JSON and copy to the clipboard.
     */
    function copyToClipboard() {
        const levelData = {
            thresholds: [
                parseInt(el.threshold1.value),
                parseInt(el.threshold2.value),
                parseInt(el.threshold3.value),
            ],
            basePoints: parseInt(el.points.value),
            name: el.name.value,
            data: level.data,
            connections: level.connectionData(),
        };
        navigator.clipboard.writeText(JSON.stringify(levelData, null, 2)).then(
            () => { },
            () => {
                alert('Copy failed.');
            }
        );
    }
    /**
     * Clear all level data after user's consent.
     */
    function clearLevel() {
        if (confirm('Do you really want to discard your work and begin from scratch?')) {
            for (const conn of level.connections) {
                conn.line.remove();
            }
            level.data = generateEmptyLevel(parseInt(el.width.value), parseInt(el.height.value));
            level.connections = [];
            build();
            evaluateTiles();
            updateAll();
        }
    }
    function removeHash() {
        if (window.history.pushState) {
            window.history.pushState('', '/', window.location.pathname)
        }
        else {
            window.location.hash = '';
        }
    }
    function onKeyPress(e) {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
            return;
        }
        let newSelectedItem = selectedItem;
        switch (e.key) {
            case 'r':
            case '#':
                newSelectedItem = 'rock';
                break;
            case 't':
                newSelectedItem = 'tree';
                break;
            case 'm':
            case '.':
                newSelectedItem = 'marker';
                break;
            case 'i':
            case ' ':
                newSelectedItem = 'ice';
                break;
            case '$':
            case 'c':
                newSelectedItem = 'coin';
                break;
            case 'g':
                newSelectedItem = 'gold';
                break;
            case 'f':
                newSelectedItem = 'flower';
                break;
            case 'o':
                newSelectedItem = 'hole';
                break;
            case 'p':
                newSelectedItem = 'penguin';
                break;
            case 'x':
                newSelectedItem = 'exit';
                break;
            default:
                break;
        }
        if (newSelectedItem !== selectedItem) {
            setSelectedItem(newSelectedItem);
            document.itemForm.item.value = newSelectedItem;
        }
        if (document.activeElement !== el.name) {
            e.preventDefault();
        }
    }
    function onKeyDown(e) {
        if (e.altKey && e.key === 'Alt') {
            if (A === null) {
                A = { ...currentPos };
            }
            else {
                B = { ...currentPos };
            }
            if (A !== null && B !== null) {
                solveAB(A, B)
                    .then(path => {
                        if (path) {
                            console.log('SOLVED', path.map(node => node.move).join(''));
                        }
                        A = B = null;
                    });
            }
            return e.preventDefault();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            undo();
            updateAll();
            return e.preventDefault();
        }
    }
    function onKeyUp(e) {
        if (e.key === 'Alt') {
            solve().then(path => {
                if (path) {
                    console.log('SOLVED', path.map(node => node.move).join(''));
                }
            });
        }
        switch (e.key) {
            case 'Delete':
            // fall-through
            case 'Backspace':
                if (selectedConnectionLine !== null) {
                    level.connections = level.connections.filter(conn => conn.line !== selectedConnectionLine);
                    selectedConnectionLine.remove();
                    selectedConnectionLine = null;
                    updateAll();
                    // TODO: enable undo for this action
                }
                break;
            case 'Escape':
                if (state === State.Connecting) {
                    state = State.Default;
                    connectionLine.remove();
                    connectionLine = null;
                    el.gameContainer.style.setProperty('cursor', 'pointer');
                }
                break;
        }
    }
    function onSceneClicked(e) {
        switch (state) {
            case State.Connecting:
                if (e.target.classList.contains('hole') && hole1 !== e.target) {
                    el.gameContainer.style.setProperty('cursor', 'pointer');
                    connectionLine.setAttribute('x2', upscaled(e.target.getAttribute('data-x')));
                    connectionLine.setAttribute('y2', upscaled(e.target.getAttribute('data-y')));
                    addConnectionLineListeners(connectionLine);
                    level.connections.push({
                        src: hole1,
                        dst: e.target,
                        line: connectionLine,
                    });
                    undoHistory.add(new Undoable(function undoConnection() {
                        level.connections.pop().line.remove();
                        updateAll();
                    }));
                    state = State.Default;
                    updateAll();
                    e.stopImmediatePropagation();
                    return e.preventDefault();
                }
            case State.Default:
            // fall-through
            default:
                if (e.target.classList.contains('hole') && (e.altKey || e.ctrlKey || e.metaKey)) {
                    if (holeIsSource(e.target)) {
                        return e.stopPropagation();
                    }
                    state = State.Connecting;
                    hole1 = e.target;
                    const x = parseInt(hole1.getAttribute('data-x'));
                    const y = parseInt(hole1.getAttribute('data-y'));
                    connectionLine = createConnectionLine({ x, y }, { x, y });
                    connectionLine.setAttribute('x2', x * Tile.Size + e.layerX);
                    connectionLine.setAttribute('y2', y * Tile.Size + e.layerY);
                    el.connections.appendChild(connectionLine);
                    el.gameContainer.style.setProperty('cursor', 'not-allowed');
                }
                e.stopPropagation();
                return e.preventDefault();
        }
    }
    function onSceneMouseMove(e) {
        switch (state) {
            case State.Connecting:
                if (e.target.classList.contains('hole')) {
                    el.gameContainer.style.setProperty('cursor', 'pointer');
                }
                else {
                    el.gameContainer.style.setProperty('cursor', 'not-allowed');
                }
                connectionLine.setAttribute('x2', upscaled(e.target.getAttribute('data-x')));
                connectionLine.setAttribute('y2', upscaled(e.target.getAttribute('data-y')));
                break;
            default:
                currentPos = {
                    x: e.target.getAttribute('data-x') | 0,
                    y: e.target.getAttribute('data-y') | 0,
                };
                break;
        }
    }
    function onTileClicked(e) {
        if (state !== State.Default || e.altKey || e.ctrlKey || e.metaKey)
            return e.preventDefault();
        el.game.querySelectorAll('.hint').forEach(el => el.remove());
        const beforeClassName = e.target.className;
        if (e.shiftKey) {
            e.target.className = `tile ice`;
        }
        else {
            e.target.className = `tile ${selectedItem}`;
        }
        if (e.target.className !== beforeClassName) {
            undoHistory.add(new Undoable(function undoTileClick() {
                e.target.className = beforeClassName;
                evaluateTiles();
                updateAll();
            }));
            evaluateTiles();
            updateAll();
        }
    }
    function onTileEntered(e) {
        if (e.buttons === 1) {
            onTileClicked(e);
        }
    }
    function onHashChanged() {
        const hash = window.location.hash.substring(1);
        const params = hash.split(';');
        let w = 0, h = 0;
        level.connections = [];
        for (const param of params) {
            const [key, value] = param.split('=');
            if (key === 'width' && Number(value) > 0) {
                w = Number.parseInt(value);
            }
            else if (key === 'height' && Number(value) > 0) {
                h = Number.parseInt(value);
            }
            else if (key === 'level' && value.length > 0) {
                level = JSON.parse(atob(value));
            }
        }
        if (level.data === null) {
            if (w > 3 && h > 3) {
                level.data = generateEmptyLevel(w, h);
                level.connections = [];
            }
            else if (localStorage.hasOwnProperty(STORAGE_KEY_LEVEL)) {
                try {
                    level = JSON.parse(localStorage.getItem(STORAGE_KEY_LEVEL));
                }
                catch (e) {
                    alert(`Cannot parse JSON data in localStorage["${STORAGE_KEY_LEVEL}"]`);
                }
            }
        }
        if (level.data === null) {
            level.data = generateEmptyLevel(parseInt(el.width.value), parseInt(el.height.value));
            level.connections = [];
        }
        level.connectionData = () => level.connections.map(conn => {
            return {
                src: {
                    x: parseInt(conn.src.getAttribute('data-x')),
                    y: parseInt(conn.src.getAttribute('data-y')),
                },
                dst: {
                    x: parseInt(conn.dst.getAttribute('data-x')),
                    y: parseInt(conn.dst.getAttribute('data-y')),
                },
            };
        });
        build();
        evaluateTiles();
        updateAll();
    }
    function generateEmptyLevel(w, h) {
        return []
            .concat([Tile.Rock.repeat(w)])
            .concat(Array(h - 2).fill(Tile.Rock + Tile.Ice.repeat(w - 2) + Tile.Rock))
            .concat([Tile.Rock.repeat(w)]);
    }
    function main() {
        el.gameContainer = document.querySelector('#game-container');
        el.game = document.querySelector('#game');
        el.playButton = document.querySelector('#play');
        el.threshold1 = document.querySelector('[name="threshold1"]');
        el.threshold2 = document.querySelector('[name="threshold2"]');
        el.threshold3 = document.querySelector('[name="threshold3"]');
        el.connections = document.querySelector('#connection-lines');
        el.message = document.querySelector('#message');
        el.status = document.querySelector('#status');
        el.problems = document.querySelector('#problems');
        el.path = document.querySelector('#path');
        el.points = document.querySelector('[name="basePoints"]');
        el.name = document.querySelector('[name="levelName"]');
        el.name.addEventListener('input', e => {
            localStorage.setItem(STORAGE_KEY_NAME, e.target.value);
        });
        if (localStorage.hasOwnProperty(STORAGE_KEY_NAME)) {
            el.name.value = localStorage.getItem(STORAGE_KEY_NAME);
        }
        el.itemForm = document.querySelectorAll('#item-form');
        el.itemForm.item.value = selectedItem;
        el.itemSelector = document.querySelectorAll('input[name="item"]');
        el.itemSelector.forEach(input => {
            input.addEventListener('change', e => {
                setSelectedItem(e.target.value);
            });
            input.checked = (selectedItem === input.value);
        });
        el.width = document.querySelector('input[name="chosen-width"]');
        el.width.addEventListener('change', e => {
            localStorage.setItem(STORAGE_KEY_WIDTH, e.target.value);
        });
        if (localStorage.hasOwnProperty(STORAGE_KEY_WIDTH)) {
            el.width.value = localStorage.getItem(STORAGE_KEY_WIDTH);
        }
        el.height = document.querySelector('input[name="chosen-height"]');
        el.height.addEventListener('change', e => {
            localStorage.setItem(STORAGE_KEY_HEIGHT, e.target.value);
        });
        if (localStorage.hasOwnProperty(STORAGE_KEY_HEIGHT)) {
            el.height.value = localStorage.getItem(STORAGE_KEY_HEIGHT);
        }
        el.scene = document.createElement('div');
        el.scene.id = 'scene';
        el.scene.addEventListener('click', onSceneClicked);
        el.scene.addEventListener('mousemove', onSceneMouseMove);
        document.querySelector('#clear').addEventListener('click', clearLevel);
        document.querySelector('#copy-to-clipboard').addEventListener('click', copyToClipboard);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('keypress', onKeyPress);
        window.addEventListener('hashchange', onHashChanged);
        onHashChanged();
    }
    window.addEventListener('load', main);
})(window);