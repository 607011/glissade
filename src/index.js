(function (window) {
    "use strict";

    // Bézier code
    // Copyright ©️ 2015 Gaëtan Renaudeau
    // https://github.com/gre/bezier-easing
    const NEWTON_ITERATIONS = 4;
    const NEWTON_MIN_SLOPE = 0.001;
    const SUBDIVISION_PRECISION = 0.0000001;
    const SUBDIVISION_MAX_ITERATIONS = 100;
    const kSplineTableSize = 101;
    const kSampleStepSize = 1 / (kSplineTableSize - 1);
    const float32ArraySupported = typeof Float32Array === 'function';
    function A(aA1, aA2) { return 1 - 3 * aA2 + 3 * aA1; }
    function B(aA1, aA2) { return 3 * aA2 - 6 * aA1; }
    function C(aA1) { return 3 * aA1; }
    function calcBezier(aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT; }
    function getSlope(aT, aA1, aA2) { return 3 * A(aA1, aA2) * aT * aT + 2 * B(aA1, aA2) * aT + C(aA1); }
    function binarySubdivide(aX, aA, aB, mX1, mX2) {
        let currentX, currentT, i = 0;
        do {
            currentT = aA + (aB - aA) / 2;
            currentX = calcBezier(currentT, mX1, mX2) - aX;
            if (currentX > 0) {
                aB = currentT;
            } else {
                aA = currentT;
            }
        } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
        return currentT;
    }
    function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
        for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
            let currentSlope = getSlope(aGuessT, mX1, mX2);
            if (currentSlope === 0.0) {
                return aGuessT;
            }
            let currentX = calcBezier(aGuessT, mX1, mX2) - aX;
            aGuessT -= currentX / currentSlope;
        }
        return aGuessT;
    }
    function LinearEasing(x) {
        return x;
    }
    function bezier(mX1, mY1, mX2, mY2) {
        if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
            throw new Error('bezier x values must be in [0, 1] range');
        }
        if (mX1 === mY1 && mX2 === mY2) {
            return LinearEasing;
        }
        // Precompute samples table
        let sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
        for (let i = 0; i < kSplineTableSize; ++i) {
            sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
        }
        function getTForX(aX) {
            let intervalStart = 0.0;
            let currentSample = 1;
            let lastSample = kSplineTableSize - 1;
            for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
                intervalStart += kSampleStepSize;
            }
            --currentSample;
            // Interpolate to provide an initial guess for t
            let dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
            let guessForT = intervalStart + dist * kSampleStepSize;
            let initialSlope = getSlope(guessForT, mX1, mX2);
            if (initialSlope >= NEWTON_MIN_SLOPE) {
                return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
            }
            else if (initialSlope === 0.0) {
                return guessForT;
            }
            else {
                return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
            }
        }
        return function BezierEasing(x) {
            if (x === 0) {
                return 0;
            }
            if (x === 1) {
                return 1;
            }
            return calcBezier(getTForX(x), mY1, mY2);
        };
    };
    // end of Bézier code

    class State {
        static Playing = 1;
        static LevelEnd = 2;
    };

    class Tile {
        static ICE = ' ';
        static ROCK = '#';
        static EXIT = 'X';
        static PLAYER = 'P';
        static COIN = '$';
        static GOLD = 'G';
        static HOLE = 'O';
        static SIZE = 32;
    };

    const POINTS = {
        '$': 5,
        'G': 20,
    };
    const DEFAULT_GAME = ["####################", "#   # # #          #", "#      ###  #     O#", "#       #   #  #   #", "##  # #  # #       #", "#       #    #   ###", "#      # #  #      #", "##      #       ## #", "#    ### ### ## #  #", "#    #P #          #", "# O               ##", "#       #          #", "#        # #       #", "#   #   #   #    # #", "#    #   #  #  #   #", "#  #    #      ## ##", "#     #  #    ##   #", "#     # # #        X", "# #  ##    #    #  #", "####################"];
    const el = {};
    const easingWithoutOvershoot = bezier(.34, .87, 1, 1);
    const easingWithOvershoot = bezier(.34, .87, 1, 1.1);
    let player = {
        x: 0,
        y: 0,
        dest: { x: 0, y: 0 },
        el: null,
        score: 0,
        moves: [],
        distance: 0,
    };
    let level = [[]];
    let state;
    let levelNum = 0;
    let width = 0;
    let height = 0;
    let t0, t1, animationDuration;
    let tiles = [[]];
    let holes = [];
    let isMoving = false;
    let exitReached = false;
    let holeEntered = false;
    let easing = null;
    const audioCtx = new AudioContext;
    const fxGainNode = audioCtx.createGain();
    const exitSound = new Audio('static/sounds/exit.wav');
    const coinSound = new Audio('static/sounds/coin.wav');
    const rockSound = new Audio('static/sounds/rock.wav');
    const teleportSound = new Audio('static/sounds/teleport.wav');
    const audioSink = audioCtx.destination;
    function placePlayerAt(x, y) {
        player.x = x;
        player.y = y;
        player.el.style.left = `${Tile.SIZE * x}px`;
        player.el.style.top = `${Tile.SIZE * y}px`;
    }
    function playAudio(sound) {
        sound.play()
            .then(e => console.log(e))
            .catch(e => console.error(e));
    }
    function teleport() {
        teleportSound.play();
        const otherHole = holes.filter(v => v.x !== player.x && v.y !== player.y)[0];
        placePlayerAt(otherHole.x, otherHole.y);
    }
    function onExitReached() {
        playAudio(exitSound);
        el.overlay.classList.remove('hidden');
    }
    function rockHit() {
        playAudio(rockSound);
    }
    function updateMoveCounter() {
        el.moveCount.textContent = player.moves.length;
        el.distance.textContent = player.distance;
    }
    function animate() {
        const dt = performance.now() - t0;
        const f = easing(dt / animationDuration);
        const dx = f * (player.dest.x - player.x);
        const dy = f * (player.dest.y - player.y);
        const x = player.x + Math.round(dx);
        const y = player.y + Math.round(dy);
        if (level[y][x] === Tile.COIN) {
            tiles[y][x].classList.replace('coin', 'ice');
            level[y] = level[y].substring(0, x) + Tile.ICE + level[y].substring(x + 1);
            player.score += POINTS[Tile.COIN];
            el.score.textContent = player.score;
            playAudio(coinSound);
        }
        player.el.style.left = `${Tile.SIZE * (player.x + dx)}px`;
        player.el.style.top = `${Tile.SIZE * (player.y + dy)}px`;
        if (performance.now() > t1) {
            placePlayerAt(player.dest.x, player.dest.y);
            updateMoveCounter();
            isMoving = false;
            if (exitReached) {
                onExitReached();
            }
            else if (holeEntered) {
                teleport();
            }
            else {
                rockHit();
            }
        }
        else {
            requestAnimationFrame(animate);
        }
    }
    function move(dx, dy) {
        if (isMoving || exitReached)
            return;
        let { x, y } = player;
        while ([Tile.ICE, Tile.COIN].includes(level[y + dy][x + dx])) {
            x += dx;
            y += dy;
        }
        exitReached = level[y + dy][x + dx] === Tile.EXIT;
        holeEntered = level[y + dy][x + dx] === Tile.HOLE;
        const dist = Math.abs((x - player.x) + (y - player.y));
        if (exitReached || holeEntered || dist > 0) {
            player.distance += dist;
            isMoving = true;
            if (exitReached || holeEntered) {
                player.dest.x = x + dx;
                player.dest.y = y + dy;
                easing = easingWithoutOvershoot;
            }
            else {
                player.dest = { x, y };
                easing = easingWithOvershoot;
            }
            animationDuration = 100 * dist;
            t0 = performance.now();
            t1 = t0 + animationDuration;
            requestAnimationFrame(animate);
        }
    }
    function moveUp() {
        move(0, -1);
    }
    function moveDown() {
        move(0, +1);
    }
    function moveLeft() {
        move(-1, 0);
    }
    function moveRight() {
        move(+1, 0);
    }
    function onKeyPressed(e) {
        if (isMoving)
            return;
        let move;
        switch (e.key) {
            case 'w':
            // fall-through
            case 'ArrowUp':
                moveUp();
                move = 'U';
                break;
            case 'a':
            // fall-through
            case 'ArrowLeft':
                moveLeft();
                move = 'L';
                break;
            case 's':
            // fall-through
            case 'ArrowDown':
                moveDown();
                move = 'D';
                break;
            case 'd':
            // fall-through
            case 'ArrowRight':
                moveRight();
                move = 'R';
                break;
        }
        if (move) {
            player.moves.push(move);
        }
    }
    function onClick(e) {
        const dx = (e.target.offsetLeft / Tile.SIZE) - player.x;
        const dy = (e.target.offsetTop / Tile.SIZE) - player.y;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                window.dispatchEvent(new KeyboardEvent('keypress', { 'key': 'd' }));
            }
            else {
                window.dispatchEvent(new KeyboardEvent('keypress', { 'key': 'a' }));
            }
        }
        else {
            if (dy > 0) {
                window.dispatchEvent(new KeyboardEvent('keypress', { 'key': 's' }));
            }
            else {
                window.dispatchEvent(new KeyboardEvent('keypress', { 'key': 'w' }));
            }
        }
        checkAudio();
    }
    function generateScene() {
        const scene = document.createElement('div');
        scene.style.gridTemplateColumns = `repeat(${width}, ${Tile.SIZE}px)`;
        scene.style.gridTemplateRows = `repeat(${height}, ${Tile.SIZE}px)`;
        holes = [];
        tiles = [];
        for (let y = 0; y < level.length; ++y) {
            const row = level[y];
            tiles.push([]);
            for (let x = 0; x < row.length; ++x) {
                const item = row[x];
                const tile = document.createElement('span');
                tile.className = 'tile';
                switch (item) {
                    case Tile.ROCK:
                        tile.classList.add('rock');
                        break;
                    case Tile.COIN:
                        tile.classList.add('coin');
                        break;
                    case Tile.GOLD:
                        tile.classList.add('gold');
                        break;
                    case Tile.EXIT:
                        tile.classList.add('exit');
                        break;
                    case Tile.HOLE:
                        tile.classList.add('hole');
                        holes.push({ x, y });
                        break;
                    case Tile.PLAYER:
                        placePlayerAt(x, y);
                    // fall-through
                    case Tile.ICE:
                    default:
                        tile.classList.add('ice');
                        break;
                }
                scene.appendChild(tile);
                tiles[y].push(tile);
            }
        }
        return scene;
    }
    function replacePlayerWithIceTile() {
        level[player.y] = level[player.y].substring(0, player.x) + Tile.ICE + level[player.y].substring(player.x + 1);
    }
    function setLevel(levelData) {
        level = levelData;
        width = level[0].length;
        height = level.length;
        player.moves = [];
        player.distance = 0;
        updateMoveCounter();
        el.scene = generateScene();
        el.game.replaceChildren(el.scene, player.el);
        replacePlayerWithIceTile();
    }
    function reset() {
        state = State.Playing;
        exitReached = false;
        let levelData = [...DEFAULT_GAME];
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            const params = hash.split(';');
            for (const param of params) {
                const [key, value] = param.split('=');
                if (key === 'level' && value.length > 0) {
                    levelData = JSON.parse(atob(value));
                }
            }
        }
        setLevel(levelData);
    }
    function checkAudio() {
        if (navigator.getAutoplayPolicy('mediaelement') === 'allowed') {
            el.loudspeaker.classList.replace('speaker-muted', 'speaker');
        }
        else {
            el.loudspeaker.classList.replace('speaker', 'speaker-muted');
        }
    }
    function setupAudio() {
        checkAudio();
        fxGainNode.connect(audioSink);
        fxGainNode.gain.value = 0.1;
        const exitSource = audioCtx.createMediaElementSource(exitSound);
        const coinSource = audioCtx.createMediaElementSource(coinSound);
        const rockSource = audioCtx.createMediaElementSource(rockSound);
        const teleportSource = audioCtx.createMediaElementSource(teleportSound);
        exitSource.connect(fxGainNode);
        rockSource.connect(fxGainNode);
        coinSource.connect(fxGainNode);
        teleportSource.connect(fxGainNode);
    }
    function main() {
        el.game = document.querySelector('#game');
        el.game.addEventListener('click', onClick);
        el.score = document.querySelector('#score');
        el.distance = document.querySelector('#distance');
        el.moveCount = document.querySelector('#move-count');
        el.overlay = document.querySelector('#overlay');
        el.loudspeaker = document.querySelector('#loudspeaker');
        el.loudspeaker.addEventListener('click', checkAudio);
        player.el = document.createElement('span');
        player.el.className = 'tile penguin';
        window.addEventListener('keydown', onKeyPressed);
        window.addEventListener('keypress', onKeyPressed);
        document.querySelector('.control.up').addEventListener('click', () => {
            window.dispatchEvent(new KeyboardEvent('keypress', { 'key': 'w' }));
        });
        document.querySelector('.control.down').addEventListener('click', () => {
            window.dispatchEvent(new KeyboardEvent('keypress', { 'key': 's' }));
        });
        document.querySelector('.control.right').addEventListener('click', () => {
            window.dispatchEvent(new KeyboardEvent('keypress', { 'key': 'd' }));
        });
        document.querySelector('.control.left').addEventListener('click', () => {
            window.dispatchEvent(new KeyboardEvent('keypress', { 'key': 'a' }));
        });
        reset();
        setupAudio();
    }
    window.addEventListener('load', main);
})(window);
