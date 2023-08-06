(function (window) {
    "use strict";

    class State {
        static PreInit = -1;
        static SplashScreen = 0;
        static Playing = 1;
        static LevelEnd = 2;
        static GameEnd = 3;
        static SettingsScreen = 4;
    };

    function help() {
        const solver = new ChillySolver([...level.origData]);

        let [node, _iterations] = solver.solve();
        if (node === null) {
            document.querySelector('#path').textContent = '<no solution>';
            return;
        }
        let path = [node];
        while (node.hasParent()) {
            node = node.parent;
            path.unshift(node);
        }
        const moves = [];
        const HINT_NAMES = { 'U': 'hint-up', 'R': 'hint-right', 'D': 'hint-down', 'L': 'hint-left' };
        let { x, y } = path[0];
        for (let i = 1; i < path.length; ++i) {
            let node = path[i];
            moves.push(node.move);
            const hint = document.createElement('div');
            hint.className = `tile hint ${HINT_NAMES[node.move]}`;
            tiles[y][x].appendChild(hint);
            x = node.x;
            y = node.y;
        }
        document.querySelector('#path').textContent = `${moves.length}: ${moves.join(' ')}`;
    }


    class STORAGE_KEY {
        static LevelNum = 'glissade.level';
        static MaxLevelNum = 'glissade.max-level';
    };

    const POINTS = {
        '$': 5,
        'G': 20,
    };
    let LEVELS;
    const DEBUG = true;
    const START_LEVEL = 0;
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
    let level = {
        origData: [],
        data: [],
        score: 0,
        currentIdx: (function () {
            let levelNum = parseInt(localStorage.getItem(STORAGE_KEY.LevelNum));
            if (isNaN(levelNum)) {
                levelNum = START_LEVEL;
            }
            if (levelNum < 0) {
                levelNum = 0;
            }
            return levelNum;
        })(),
    };
    let state = State.PreInit;
    let prevState;
    let width = 0;
    let height = 0;
    let t0, t1, animationDuration;
    let pointsEarned;
    let tiles = [[]];
    let holes = [];
    let isMoving = false;
    let exitReached = false;
    let holeEntered = false;
    let easing = null;
    let sounds = {};

    function placePlayerAt(x, y) {
        player.x = x;
        player.y = y;
        player.el.style.left = `${Tile.Size * x}px`;
        player.el.style.top = `${Tile.Size * y}px`;
    }
    function standUpright() {
        for (const c of ['penguin-left', 'penguin-right', 'penguin-up', 'penguin-down']) {
            player.el.classList.remove(c);
        }
    }
    function teleport() {
        sounds.teleport.play();
        const otherHole = holes.filter(v => v.x !== player.x || v.y !== player.y)[0];
        placePlayerAt(otherHole.x, otherHole.y);
        scrollIntoView();
        standUpright();
    }
    function rockHit() {
        sounds.rock.play();
        standUpright();
    }
    function updateMoveCounter() {
        el.moveCount.title = player.moves.join('');
        el.moveCount.textContent = player.moves.length;
    }
    function animate() {
        const dt = performance.now() - t0;
        const f = easing(dt / animationDuration);
        const dx = f * (player.dest.x - player.x);
        const dy = f * (player.dest.y - player.y);
        const x = player.x + Math.round(dx);
        const y = player.y + Math.round(dy);
        if (level.data[y][x] === Tile.Coin) {
            tiles[y][x].classList.replace('coin', 'ice');
            level.data[y] = level.data[y].substring(0, x) + Tile.Ice + level.data[y].substring(x + 1);
            player.score += POINTS[Tile.Coin];
            el.levelScore.textContent = player.score;
            sounds.coin.play();
        }
        player.el.style.left = `${Tile.Size * (player.x + dx)}px`;
        player.el.style.top = `${Tile.Size * (player.y + dy)}px`;
        scrollIntoView();
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
        let hasMoved = false;
        let { x, y } = player;
        while ([Tile.Ice, Tile.Coin, Tile.Marker].includes(level.data[y + dy][x + dx])) {
            x += dx;
            y += dy;
        }
        if (x < player.x) {
            player.el.classList.add('penguin-left');
            hasMoved = true;
        }
        else if (x > player.x) {
            player.el.classList.add('penguin-right');
            hasMoved = true;
        }
        else if (y < player.y) {
            player.el.classList.add('penguin-up');
            hasMoved = true;
        }
        else if (y > player.y) {
            player.el.classList.add('penguin-down');
            hasMoved = true;
        }
        exitReached = level.data[y + dy][x + dx] === Tile.Exit;
        holeEntered = level.data[y + dy][x + dx] === Tile.Hole;
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
        return hasMoved;
    }
    function moveUp() {
        return move(0, -1);
    }
    function moveDown() {
        return move(0, +1);
    }
    function moveLeft() {
        return move(-1, 0);
    }
    function moveRight() {
        return move(+1, 0);
    }
    function onKeyPressed(e) {
        console.debug(e);
        if (!DEBUG && e.type === 'keypress' && e.key == 'r' && (e.ctrlKey || e.metaKey)) {
            // prevent reloading of page
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }
        if (e.type === 'keydown' && e.key === 'Escape') {
            if (state === State.SettingsScreen) {
                removeOverlay();
                restoreState();
            }
            else if (state != State.SplashScreen) {
                showSettingsScreen();
            }
            e.preventDefault();
            return;
        }
        switch (state) {
            case State.LevelEnd:
                if (e.type === 'keypress') {
                    if (e.key === ' ') {
                        gotoNextLevel();
                    }
                    else if (e.key === 'r') {
                        replayLevel();
                    }
                    e.preventDefault();
                }
                break;
            case State.SettingsScreen:

                break;
            case State.SplashScreen:
                if (e.type === 'keypress' && e.key === ' ') {
                    e.preventDefault();
                    play();
                }
                break;
            case State.Playing:
                if (isMoving)
                    return;
                let move;
                let hasMoved = false;
                switch (e.key) {
                    case 'w':
                    // fall-through
                    case 'ArrowUp':
                        hasMoved = moveUp();
                        move = 'U';
                        break;
                    case 'a':
                    // fall-through
                    case 'ArrowLeft':
                        hasMoved = moveLeft();
                        move = 'L';
                        break;
                    case 's':
                    // fall-through
                    case 'ArrowDown':
                        hasMoved = moveDown();
                        move = 'D';
                        break;
                    case 'd':
                    // fall-through
                    case 'ArrowRight':
                        hasMoved = moveRight();
                        move = 'R';
                        break;
                }
                if (hasMoved) {
                    player.moves.push(move);
                }
                break;
            default:
                break;
        }
    }
    function onClick(e) {
        const dx = (e.target.offsetLeft / Tile.Size) - player.x;
        const dy = (e.target.offsetTop / Tile.Size) - player.y;
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
        scene.style.gridTemplateColumns = `repeat(${width}, ${Tile.Size}px)`;
        scene.style.gridTemplateRows = `repeat(${height}, ${Tile.Size}px)`;
        holes = [];
        tiles = [];
        for (let y = 0; y < level.data.length; ++y) {
            const row = level.data[y];
            tiles.push([]);
            for (let x = 0; x < row.length; ++x) {
                const item = row[x];
                const tile = document.createElement('span');
                tile.className = 'tile';
                switch (item) {
                    case Tile.Rock:
                        tile.classList.add('rock');
                        break;
                    case Tile.Empty:
                        tile.classList.add('empty');
                        break;
                    case Tile.Coin:
                        tile.classList.add('coin');
                        break;
                    case Tile.Gold:
                        tile.classList.add('gold');
                        break;
                    case Tile.Exit:
                        tile.classList.add('exit');
                        break;
                    case Tile.Hole:
                        tile.classList.add('hole');
                        holes.push({ x, y });
                        break;
                    case Tile.Player:
                        placePlayerAt(x, y);
                    // fall-through
                    case Tile.Ice:
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
        level.data[player.y] = level.data[player.y].substring(0, player.x) + Tile.Ice + level.data[player.y].substring(player.x + 1);
    }
    function getNumStars() {
        const numStars = 3 - LEVELS[level.currentIdx].thresholds.findIndex(threshold => player.moves.length <= threshold);
        if (numStars === 4) {
            return 0;
        }
        return numStars;
    }
    function animatePointsEarned() {
        const ANIMATION_DURATION = 750;
        const dt = performance.now() - t0;
        const f = dt / ANIMATION_DURATION;
        el.pointsEarned.textContent = Math.round(f * pointsEarned);
        if (dt < ANIMATION_DURATION) {
            window.requestAnimationFrame(animatePointsEarned);
        }
    }
    function onExitReached() {
        sounds.exit.play();
        standUpright();
        setState(State.LevelEnd);
        console.debug(level.currentIdx, LEVELS.length, level.currentIdx < LEVELS.length)
        if (level.currentIdx < LEVELS.length) {
            const congrats = el.congratsTemplate.content.cloneNode(true);
            congrats.querySelector('div.pulsating > span').textContent = level.currentIdx + 1 + 1;
            const stars = congrats.querySelectorAll('.star-pale');
            const numStars = getNumStars();
            for (let i = 0; i < numStars; ++i) {
                stars[i].classList.replace('star-pale', 'star');
                stars[i].classList.add('pulse');
            }
            congrats.querySelector('div>div>div').innerHTML = (function () {
                switch (numStars) {
                    case 0:
                        return 'Awww ... you could do better';
                    case 1:
                        return 'Well done, but there&rsquo;s room for improvement.';
                    case 2:
                        return 'Good job! But you could do a little bit better.';
                    case 3:
                        return 'Excellent! You scored perfectly.';
                    default:
                        return;
                }
            })();
            el.pointsEarned = congrats.querySelector('.points-earned');
            el.proceed = congrats.querySelector('[data-command="proceed"]');
            el.replay = congrats.querySelector('[data-command="replay"]');
            el.proceed.addEventListener('click', gotoNextLevel, { capture: true, once: true });
            el.replay.addEventListener('click', replayLevel, { capture: true, once: true });
            el.overlayBox.replaceChildren(congrats);
            t0 = performance.now();
            pointsEarned = getLevelScore();
            animatePointsEarned();
        }
        else {
            // ...
        }
        showOverlay();
    }
    function setLevel(levelData) {
        level.data = [...levelData];
        level.origData = [...levelData];
        width = level.data[0].length;
        height = level.data.length;
        el.levelNum.textContent = `Level ${level.currentIdx + 1}`;
        player.moves = [];
        player.distance = 0;
        updateMoveCounter();
        el.scene = generateScene();
        el.game.replaceChildren(el.scene, player.el);
        el.extras.style.width = `${el.gameContainer.clientWidth}px`;
        replacePlayerWithIceTile();
    }
    function restoreState() {
        state = prevState;
    }
    function setState(newState) {
        console.debug(`setState(${state}) ${prevState} -> ${state}`);
        prevState = state;
        state = newState;
    }
    function showOverlay() {
        el.overlay.classList.remove('hidden');
        el.overlayBox.classList.remove('hidden');
    }
    function removeOverlay() {
        el.overlay.classList.add('hidden');
        el.overlayBox.classList.add('hidden');
        el.overlayBox.replaceChildren();
    }
    function play() {
        el.overlayBox.removeEventListener('click', play);
        setState(State.Playing);
        removeOverlay();
        checkAudio();
    }
    function replayLevel() {
        el.replay.addEventListener('click', replayLevel, { capture: true, once: true });
        player.score -= level.score;
        resetLevel();
        play();
    }
    function maxLevelNum() {
        let maxLvl = parseInt(localStorage.getItem(STORAGE_KEY.MaxLevelNum));
        if (isNaN(maxLvl)) {
            maxLvl = 0;
        }
        return Math.max(level.currentIdx, Math.min(LEVELS.length, maxLvl));
    }
    function getLevelScore() {
        return (getNumStars() + 1) * (level.score + LEVELS[level.currentIdx].basePoints);
    }
    function gotoLevel(idx) {
        level.currentIdx = idx;
        localStorage.setItem(STORAGE_KEY.LevelNum, level.currentIdx);
        resetLevel();
        play();
    }
    function gotoNextLevel() {
        el.proceed.removeEventListener('click', gotoNextLevel);
        player.score += pointsEarned;
        el.totalScore.textContent = player.score;
        ++level.currentIdx;
        localStorage.setItem(STORAGE_KEY.LevelNum, level.currentIdx);
        localStorage.setItem(STORAGE_KEY.MaxLevelNum, maxLevelNum());
        resetLevel();
        play();
    }
    function showSplashScreen() {
        setState(State.SplashScreen);
        const splash = el.splashTemplate.content.cloneNode(true);
        el.overlayBox.replaceChildren(splash);
        el.overlayBox.addEventListener('click', play, { capture: true, once: true });
        showOverlay();
    }
    function showSettingsScreen() {
        setState(State.SettingsScreen);
        const settings = el.settingsTemplate.content.cloneNode(true);
        const lvlList = settings.querySelector('.level-list');
        const padding = 1 + Math.floor(Math.log10(LEVELS.length));
        for (let i = 0; i < maxLevelNum(); ++i) {
            const div = document.createElement('div');
            const lvlName = LEVELS[i].name
                ? LEVELS[i].name
                : '<?>';
            div.textContent = `Level ${(i + 1).toString().padStart(padding, ' ')}: ${lvlName}`;
            div.addEventListener('click', () => {
                removeOverlay();
                gotoLevel(i);
            });
            lvlList.appendChild(div);
        }
        el.overlayBox.replaceChildren(settings);
        showOverlay();
    }
    function resetLevel() {
        exitReached = false;
        level.score = 0;
        el.levelScore.textContent = '0';
        el.totalScore.textContent = player.score;
        let levelData = LEVELS[level.currentIdx].data;
        el.path.textContent = '';
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
    function restartGame() {
        resetLevel();
    }
    function checkAudio(e) {
        if (typeof e === 'object' && e.type == 'click') {
            Howler.mute(!Howler._muted);
        }
        if (Howler._muted) {
            el.loudspeaker.classList.replace('speaker', 'speaker-muted');
        }
        else {
            el.loudspeaker.classList.replace('speaker-muted', 'speaker');
        }
    }
    function setupAudio() {
        sounds.coin = new Howl({
            src: ['static/sounds/coin.mp3', 'static/sounds/coin.webm', 'static/sounds/coin.ogg'],
        });
        sounds.rock = new Howl({
            src: ['static/sounds/rock.mp3', 'static/sounds/rock.webm', 'static/sounds/rock.ogg'],
        });
        sounds.exit = new Howl({
            src: ['static/sounds/exit.mp3', 'static/sounds/exit.webm', 'static/sounds/exit.ogg'],
        });
        sounds.teleport = new Howl({
            src: ['static/sounds/teleport.mp3', 'static/sounds/teleport.webm', 'static/sounds/teleport.ogg'],
        });
        sounds.slide = new Howl({
            src: ['static/sounds/slide.mp3', 'static/sounds/slide.webm', 'static/sounds/slide.ogg'],
            volume: .5,
        });
        Howler.mute(false);
        checkAudio();
    }
    function main() {
        el.game = document.querySelector('#game');
        el.game.addEventListener('click', onClick);
        el.gameContainer = document.querySelector('#game-container');
        el.totalScore = document.querySelector('#total-score');
        el.levelScore = document.querySelector('#level-score');
        el.levelNum = document.querySelector('#level-num');
        el.moveCount = document.querySelector('#move-count');
        el.extras = document.querySelector('#extras');
        el.path = document.querySelector('#path');
        el.overlay = document.querySelector('#overlay');
        el.overlayBox = document.querySelector('#overlay-box');
        el.chooseLevel = document.querySelector('#choose-level');
        el.chooseLevel.addEventListener('click', showSettingsScreen);
        el.loudspeaker = document.querySelector('#loudspeaker');
        el.loudspeaker.addEventListener('click', checkAudio);
        el.helpButton = document.querySelector('#help');
        el.helpButton.addEventListener('click', help);
        el.splashTemplate = document.querySelector("#splash");
        el.congratsTemplate = document.querySelector("#congrats");
        el.settingsTemplate = document.querySelector("#settings");
        player.el = document.createElement('span');
        player.el.className = 'tile penguin';
        setupAudio();
        fetch('static/levels.json')
            .then(response => response.json())
            .then(json => {
                LEVELS = json;
                window.addEventListener('keydown', onKeyPressed);
                window.addEventListener('keypress', onKeyPressed);
                document.querySelector('.control.arrow-up').addEventListener('click', () => {
                    window.dispatchEvent(new KeyboardEvent('keypress', { 'key': 'w' }));
                });
                document.querySelector('.control.arrow-down').addEventListener('click', () => {
                    window.dispatchEvent(new KeyboardEvent('keypress', { 'key': 's' }));
                });
                document.querySelector('.control.arrow-right').addEventListener('click', () => {
                    window.dispatchEvent(new KeyboardEvent('keypress', { 'key': 'd' }));
                });
                document.querySelector('.control.arrow-left').addEventListener('click', () => {
                    window.dispatchEvent(new KeyboardEvent('keypress', { 'key': 'a' }));
                });
                restartGame();
                showSplashScreen();
            })
            .catch(e => console.error(e));
        document.querySelector('#controls').classList.remove('hidden');
    }
    window.addEventListener('load', main);
})(window);
