(function (window) {
    "use strict";
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
    let shiftPressed = false;
    let undoHistory = new UndoHistory;
    let level = null;
    let width;
    let height;
    async function solve() {
        const solver = new ChillySolver([...level]);

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
        el.threshold2.value = moves.length+1;
        el.threshold3.value = Math.round(moves.length*1.4);
    }
    function undo() {
        undoHistory.undo();
    }
    function saveLevel(rows) {
        level = rows;
        localStorage.setItem(STORAGE_KEY_LEVEL, JSON.stringify(level));
    }
    function updatePlayButton() {
        let playableLevel = level.map(row => row.replaceAll(Tile.Marker, Tile.Ice));
        el.playButton.href = `index.html#level=${btoa(JSON.stringify(playableLevel))}`;
        el.output.value = level.join('\n');
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
        for (let y = 0; y < level.length; ++y) {
            const row = level[y];
            for (let x = 0; x < row.length; ++x) {
                const item = row[x];
                const tile = document.createElement('span');
                tile.className = 'tile';
                tile.addEventListener('click', onTileClicked);
                tile.addEventListener('mouseenter', onTileEntered);
                tile.setAttribute('data-coord', `${x}-${y}`);
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
    function build() {
        width = level[0].length;
        height = level.length;
        el.output.cols = width;
        el.output.rows = height;
        el.scene.style.gridTemplateColumns = `repeat(${width}, ${Tile.Size}px)`;
        el.scene.style.gridTemplateRows = `repeat(${height}, ${Tile.Size}px)`;
        el.scene.replaceChildren(...generateTiles());
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
    function onPasted(e) {
        e.preventDefault();
        el.output.value = e.clipboardData.getData('text');
        const levelData = el.output.value.split(/\n/g);
        saveLevel(levelData);
        updatePlayButton();
        build();
        removeHash();
        solve();
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
        shiftPressed = e.key === 'Shift';
    }
    function onKeyUp(e) {
        if (e.key === 'Shift') {
            shiftPressed = false;
        }
    }
    function onTileClicked(e) {
        el.game.querySelectorAll('.hint').forEach(el => el.remove());
        const beforeClassName = e.target.className;
        if (shiftPressed) {
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
        if (level === null) {
            if (w > 3 && h > 3) {
                level = generateEmptyLevel(w, h);
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
        if (level === null) {
            level = generateEmptyLevel(parseInt(el.width.value), parseInt(el.height.value));
        }
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
        el.game = document.querySelector('#game');
        el.playButton = document.querySelector('#play');
        el.solveButton = document.querySelector('#solve');
        el.solveButton.addEventListener('click', solve);
        el.threshold1 = document.querySelector('[name="threshold1"]');
        el.threshold2 = document.querySelector('[name="threshold2"]');
        el.threshold3 = document.querySelector('[name="threshold3"]');
        el.points = document.querySelector('[name="basePoints"]');
        el.output = document.querySelector('#output');
        el.output.addEventListener('paste', onPasted);
        el.output.addEventListener('focus', e => e.target.select());
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
        document.querySelector('#clear').addEventListener('click',
            () => {
                if (confirm('Do you really want to discard your work and begin from scratch?')) {
                    level = generateEmptyLevel(parseInt(el.width.value), parseInt(el.height.value));
                }
                build();
                evaluateTiles();
                updatePlayButton();
            });
        document.querySelector('#copy-to-clipboard').addEventListener('click',
            () => {
                const levelData = {
                    thresholds: [
                        parseInt(el.threshold1.value),
                        parseInt(el.threshold2.value),
                        parseInt(el.threshold3.value),
                    ],
                    basePoints: parseInt(el.points.value),
                    name: '<no name>',
                    data: level,
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
        onHashChanged();
    }
    window.addEventListener('load', main);
})(window);