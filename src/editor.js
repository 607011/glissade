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
    const el = {};
    let selectedItem = 'rock';
    let state = State.Default;
    let undoHistory = new UndoHistory;
    let level = {
        data: null,
        connections: [],
    };
    let width;
    let height;
    let hole1;
    let connectionLine;
    async function solve() {
        const solver = new ChillySolver({
            data: level.data,
            connections: level.connectionData()
        });
        let [node, iterations] = await solver.shortestPath();
        if (node === null) {
            document.querySelector('#path').textContent = '<no solution>';
            return;
        }
        let path = [node];
        while (node.hasParent()) {
            node = node.parent;
            path.unshift(node);
        }
        el.game.querySelectorAll('.hint').forEach(el => el.remove());
        const moves = [];
        const HINT_NAMES = { 'U': 'hint-up', 'R': 'hint-right', 'D': 'hint-down', 'L': 'hint-left' };
        let { x, y } = path[0];
        for (let i = 1; i < path.length; ++i) {
            let node = path[i];
            moves.push(node.move);
            const hint = document.createElement('div');
            hint.className = `tile hint ${HINT_NAMES[node.move]}`;
            el.game.querySelector(`[data-coord="${x}-${y}"]`).appendChild(hint);
            x = node.x;
            y = node.y;
        }
        document.querySelector('#path').textContent = `${moves.length}: ${moves.join(' ')} (${iterations} iterations)`;
        el.points.value = Math.round(iterations / 10);
        el.threshold1.value = moves.length;
        el.threshold2.value = moves.length + 1;
        el.threshold3.value = Math.round(moves.length * 1.4);
    }
    function undo() {
        undoHistory.undo();
    }
    function saveLevel(rows) {
        if (rows instanceof Array) {
            level.data = rows;
        }
        localStorage.setItem(STORAGE_KEY_LEVEL, JSON.stringify({
            data: level.data,
            connections: level.connectionData(),
        }));
    }
    function updatePlayButton() {
        let playableLevel = {
            connections: level.connectionData(),
            data: level.data.map(row => row.replaceAll(Tile.Marker, Tile.Ice)),
        };
        el.playButton.href = `index.html#level=${btoa(JSON.stringify(playableLevel))}`;
    }
    function createConnectionLine(x1, y1, x2, y2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', 'red');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('marker-end', 'url(#endarrow)');
        return line;
    }
    function evaluateTiles() {
        let x = 0;
        let rows = [];
        let row = '';
        for (const tile of el.scene.children) {
            if (tile.classList.contains('rock')) {
                row += Tile.Rock;
            }
            else if (tile.classList.contains('empty')) {
                row += Tile.Empty;
            }
            else if (tile.classList.contains('penguin')) {
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
                        tile.classList.add('penguin');
                        break;
                    case Tile.Marker:
                        tile.classList.add('marker');
                        break;
                    case Tile.Ice:
                    // fall-through
                    default:
                        tile.classList.add('ice');
                        break;
                }
                tiles.push(tile);
            }
        }
        return tiles;
    }
    function holeIsSource(element) {
        return level.connections.some(conn => conn.src === element);
    }
    function build() {
        width = level.data[0].length;
        height = level.data.length;
        el.scene.style.gridTemplateColumns = `repeat(${width}, ${Tile.Size}px)`;
        el.scene.style.gridTemplateRows = `repeat(${height}, ${Tile.Size}px)`;
        el.scene.style.width = `${width * Tile.Size}px`;
        el.scene.style.height = `${height * Tile.Size}px`;
        el.scene.replaceChildren(...generateTiles());
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
                const line = createConnectionLine(
                    x1 * Tile.Size + Tile.Size / 2,
                    y1 * Tile.Size + Tile.Size / 2,
                    x2 * Tile.Size + Tile.Size / 2,
                    y2 * Tile.Size + Tile.Size / 2);
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
            selectedItem = newSelectedItem;
            document.itemForm.item.value = selectedItem;
            e.preventDefault();
        }
    }
    function onKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            undo();
            solve();
            return;
        }
    }
    function onKeyUp(e) {
        switch (e.key) {
            case 'Escape':
                if (state === State.Connecting) {
                    state = State.Default;
                    connectionLine.remove();
                    connectionLine = null;
                }
                break;
        }
    }
    function onSceneClicked(e) {
        switch (state) {
            case State.Connecting:
                if (e.target.classList.contains('hole') && hole1 !== e.target) {
                    el.gameContainer.style.setProperty('cursor', 'pointer');
                    connectionLine.setAttribute('x2', parseInt(e.target.getAttribute('data-x')) * Tile.Size + Tile.Size / 2);
                    connectionLine.setAttribute('y2', parseInt(e.target.getAttribute('data-y')) * Tile.Size + Tile.Size / 2);
                    level.connections.push({
                        src: hole1,
                        dst: e.target,
                        line: connectionLine,
                    });
                    saveLevel();
                    undoHistory.add(new Undoable(function undoConnection() {
                        level.connections.pop().line.remove();
                        saveLevel();
                    }));
                    state = State.Default;
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
                    const x = Tile.Size * parseInt(hole1.getAttribute('data-x'));
                    const y = Tile.Size * parseInt(hole1.getAttribute('data-y'));
                    connectionLine = createConnectionLine(x + Tile.Size / 2, y + Tile.Size / 2, x + e.layerX, y + e.layerY)
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
                connectionLine.setAttribute('x2', parseInt(e.target.getAttribute('data-x')) * Tile.Size + Tile.Size / 2);
                connectionLine.setAttribute('y2', parseInt(e.target.getAttribute('data-y')) * Tile.Size + Tile.Size / 2);
                break;
            default:
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
                updatePlayButton();
            }));
            evaluateTiles();
            updatePlayButton();
        }
        removeHash();
        solve();
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
        updatePlayButton();
        solve();
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
        el.connections = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        el.connections.style.setProperty('z-index', '2000');
        el.connections.innerHTML =
            `<defs>
                <marker id="endarrow" 
                        markerUnits="strokeWidth"
                        markerWidth="4"
                        markerHeight="3"
                        refX="3"
                        refY="1.5"
                        orient="auto">
                    <polygon points="0 0, 4 1.5, 0 3" fill="red" />
                </marker>
            </defs>`;
        document.querySelector('#hole-connections').appendChild(el.connections);
        el.points = document.querySelector('[name="basePoints"]');
        el.itemForm = document.querySelectorAll('#item-form');
        el.itemSelector = document.querySelectorAll('input[name="item"]');
        el.itemSelector.forEach(input => {
            input.addEventListener('change', e => {
                selectedItem = e.target.value;
            });
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
        document.querySelector('#clear').addEventListener('click',
            () => {
                for (const conn of level.connections) {
                    conn.remove();
                }
                if (confirm('Do you really want to discard your work and begin from scratch?')) {
                    level.data = generateEmptyLevel(parseInt(el.width.value), parseInt(el.height.value));
                    level.connections = [];
                }
                build();
                evaluateTiles();
                updatePlayButton();
            });
        document.querySelector('#copy-to-clipboard').addEventListener('click',
            () => {
                console.debug(level);
                const levelData = {
                    thresholds: [
                        parseInt(el.threshold1.value),
                        parseInt(el.threshold2.value),
                        parseInt(el.threshold3.value),
                    ],
                    basePoints: parseInt(el.points.value),
                    name: '<no name>',
                    data: level.data,
                    connections: level.connectionData(),
                };
                navigator.clipboard.writeText(JSON.stringify(levelData, null, 2)).then(
                    () => { },
                    () => {
                        alert('Copy failed.');
                    }
                );
            });
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('keypress', onKeyPress);
        window.addEventListener('hashchange', onHashChanged);
        document.itemForm.item.value = selectedItem;
        onHashChanged();
    }
    window.addEventListener('load', main);
})(window);