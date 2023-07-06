(function (window) {
    "use strict";
    class Undoable {
        undo() { }
    }
    class TilePlaced extends Undoable {
        constructor(undoFunc) {
            super();
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
    const STORAGE_KEY = 'rutschpartie.level';
    const TILE_SIZE = 32;
    const DEFAULT_WIDTH = 16;
    const DEFAULT_HEIGHT = 16;
    const ICE = ' ';
    const ROCK = '#';
    const EXIT = 'X';
    const PLAYER = 'P';
    const HOLE = 'O';
    const BREADCRUMB = '.';
    const el = {};
    let selectedItem = 'rock';
    let shiftPressed = false;
    let undoHistory = new UndoHistory;
    let level = null;
    let width;
    let height;
    function undo() {
        undoHistory.undo();
    }
    function saveLevel(rows) {
        level = rows;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(level));
    }
    function updatePlayButton() {
        let playableLevel = level.map(row => row.replaceAll(BREADCRUMB, ICE));
        el.playButton.href = `index.html#level=${btoa(JSON.stringify(playableLevel))}`;
        el.output.value = level.join('\n');
    }
    function evaluateTiles() {
        let x = 0;
        let rows = [];
        let row = '';
        for (const tile of el.scene.children) {
            if (tile.classList.contains('rock')) {
                row += ROCK;
            }
            else if (tile.classList.contains('penguin')) {
                row += PLAYER;
            }
            else if (tile.classList.contains('exit')) {
                row += EXIT;
            }
            else if (tile.classList.contains('hole')) {
                row += HOLE;
            }
            else if (tile.classList.contains('marker')) {
                row += BREADCRUMB;
            }
            else {
                row += ICE;
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
        const tiles = [];
        for (let y = 0; y < level.length; ++y) {
            const row = level[y];
            for (let x = 0; x < row.length; ++x) {
                const item = row[x];
                const tile = document.createElement('span');
                tile.className = 'tile';
                tile.addEventListener('click', onTileClicked);
                tile.addEventListener('mousemove', onTileEntered);
                switch (item) {
                    case ROCK:
                        tile.classList.add('rock');
                        break;
                    case HOLE:
                        tile.classList.add('hole');
                        break;
                    case EXIT:
                        tile.classList.add('exit');
                        break;
                    case PLAYER:
                        tile.classList.add('penguin');
                        break;
                    case BREADCRUMB:
                        tile.classList.add('marker');
                        break;
                    case ICE:
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
        el.scene.style.gridTemplateColumns = `repeat(${width}, ${TILE_SIZE}px)`;
        el.scene.style.gridTemplateRows = `repeat(${height}, ${TILE_SIZE}px)`;
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
        el.output.value = (e.clipboardData || window.clipboardData).getData('text');
        const levelData = el.output.value.split(/\n/g);
        saveLevel(levelData);
        updatePlayButton();
        build();
        removeHash();
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
        const beforeClassName = e.target.className;
        if (shiftPressed) {
            e.target.className = `tile ice`;
        }
        else {
            e.target.className = `tile ${selectedItem}`;
        }
        if (e.target.className !== beforeClassName) {
            undoHistory.add(new TilePlaced(function undoTileClick() {
                e.target.className = beforeClassName;
                evaluateTiles();
                updatePlayButton();
            }));
            evaluateTiles();
            updatePlayButton();
        }
        removeHash();
    }
    function onTileEntered(e) {
        if (e.buttons === 1) {
            onTileClicked(e);
        }
    }
    function generateEmptyLevel(w, h) {
        return []
            .concat([ROCK.repeat(w)])
            .concat(Array(h - 2).fill(ROCK + ICE.repeat(w - 2) + ROCK))
            .concat([ROCK.repeat(w)]);
    }
    function main() {
        if (localStorage.hasOwnProperty(STORAGE_KEY)) {
            try {
                level = JSON.parse(localStorage.getItem(STORAGE_KEY));
            }
            catch (e) {
                alert(`Cannot parse JSON data in localStorage["${STORAGE_KEY}"]`);
            }
        }
        if (!(level instanceof Array) && window.location.hash) {
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
            }
            if (w > 3 && h > 3) {
                level = generateEmptyLevel(w, h);
            }
        }
        if (!(level instanceof Array)) {
            level = generateEmptyLevel(DEFAULT_WIDTH, DEFAULT_HEIGHT);
        }
        el.game = document.querySelector('#game');
        el.playButton = document.querySelector('#play');
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
        el.scene = document.createElement('div');
        el.scene.id = 'scene';
        build();
        evaluateTiles();
        updatePlayButton();
        document.querySelector('#copy-to-clipboard').addEventListener('click',
            () => {
                navigator.clipboard.writeText(JSON.stringify(level, null, 2)).then(
                    () => { },
                    () => {
                        alert('Copy failed.');
                    }
                );
            });
    }
    window.addEventListener('load', main);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('keypress', onKeyPress);
})(window);