(function (window) {
    "use strict";

    // Bézier code
    // Copyright ©️ 2015 Gaëtan Renaudeau
    // https://github.com/gre/bezier-easing
    // modified 2023 by Oliver Lau
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
        console.assert(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1);
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
        static PreInit = -1;
        static SplashScreen = 0;
        static Playing = 1;
        static LevelEnd = 2;
        static GameEnd = 3;
    };

    class Tile {
        static Size = 32;
        static Ice = ' ';
        static Marker = '.';
        static Rock = '#';
        static Exit = 'X';
        static Player = 'P';
        static Coin = '$';
        static Gold = 'G';
        static Hole = 'O';
    };

    class STORAGE_KEY {
        static LevelNum = 'glissade.level';
    };

    const POINTS = {
        '$': 5,
        'G': 20,
    };
    const LEVELS = [
        {
            basePoints: 1,
            thresholds: [1, 2, 3],
            data: [
                "############",
                "#P        X#",
                "############",
            ],
        },
        {
            basePoints: 1,
            thresholds: [3, 4, 5],
            data: [
                "################",
                "#  # X         #",
                "#              #",
                "#  P           #",
                "################"
            ],
        },
        {
            basePoints: 2,
            thresholds: [4, 6, 10],
            data: [
                "#######X########",
                "#   #       #  #",
                "#       # #    #",
                "#  #           #",
                "##             #",
                "#      #       #",
                "#  #   P   #  ##",
                "################"
            ],
        },
        {
            basePoints: 3,
            thresholds: [7, 9, 13],
            data: [
                "##############",
                "#          # #",
                "#  #  #      X",
                "#           P#",
                "# ##     #   #",
                "#    #       #",
                "##          ##",
                "#   #        #",
                "#     #      #",
                "# # #   #    #",
                "#    #    #  #",
                "#     ####   #",
                "##          ##",
                "##############"
            ],
        },
        {
            basePoints: 4,
            thresholds: [8, 9, 11],
            data: [
                "##############",
                "# #    #    P#",
                "#    #     # #",
                "#     #      #",
                "#            #",
                "#        #   #",
                "# #       #  #",
                "#      #     #",
                "#  #         #",
                "##        #  #",
                "#      #     #",
                "#   #        #",
                "#   #     #  #",
                "######X#######"
            ],
        },
        {
            basePoints: 4,
            thresholds: [11, 12, 15],
            data: [
                "############",
                "#O.........X",
                "##    ### ##",
                "#.........O#",
                "#.#   #   ##",
                "#..      # #",
                "##........ #",
                "#.........##",
                "#.  # #  # #",
                "#......    #",
                "#  #  P    #",
                "############"
            ]
        },
        {
            basePoints: 4,
            thresholds: [26, 28, 30],
            data: [
                "####################",
                "#   # # #         ##",
                "#      ###  #    O #",
                "#       #   #  #   #",
                "##  # #  # #       #",
                "#       #    #   ###",
                "#      # #  #      #",
                "##      #       ## #",
                "#    ### ### ## #  #",
                "#    #P #          #",
                "# O               ##",
                "#       #          #",
                "#        # #       #",
                "#   #   #   #    # #",
                "#    #   #  #  #   #",
                "#  #    #      ## ##",
                "#     #  #    ##   #",
                "#     # # #        X",
                "# #  ##    #    #  #",
                "####################"
            ],
        },
        {
            name: 'Around The World',
            basePoints: 5,
            thresholds: [29, 30, 40],
            data: [
                "####################",
                "#          ##      #",
                "##     #   #    #  #",
                "#  O# # #     # #  #",
                "#  #         #     #",
                "# #    #    #    # #",
                "#   #   #  #       #",
                "#    #  #### #     #",
                "#      ##  #  #    #",
                "# #     #OX#P    # #",
                "#  ###  #  ##   #  #",
                "#     # ####       #",
                "# #  #  ##   #    ##",
                "#  #   #    #   #  #",
                "#    #             #",
                "#  #               #",
                "# #    #     # #   #",
                "#   #  #    # #    #",
                "#  ###   #       # #",
                "####################"
            ],
        },
        {
            name: 'The Line',
            basePoints: 5,
            thresholds: [17, 20, 25],
            data: [
                "####################",
                "#             # #  #",
                "#  #   ##    # #   #",
                "# #     # #  #O    #",
                "#  ##        #     #",
                "#      #    #      #",
                "##    #            #",
                "#   #         ##   #",
                "#  #     #         #",
                "#                  #",
                "#  #    #        # #",
                "#   # #        #   #",
                "##     #        #  #",
                "#     ## #  #      #",
                "#    #       # #   #",
                "#             #    #",
                "# #P   #          ##",
                "# ##################",
                "#O                X#",
                "####################"
            ]
        },
        {
            name: 'Roman Rooms',
            basePoints: 5,
            thresholds: [39, 44, 50],
            data: [
                "####################",
                "# #      #   ##   P#",
                "#    ##      #     #",
                "#  # ###  #  #    ##",
                "#     #    # # #   #",
                "#     #      #   # #",
                "###  ## ########## #",
                "#     #      #O    #",
                "##    ###      #   #",
                "#   ###         #  #",
                "##    #    #     # #",
                "# #   #            #",
                "#O    #  #        ##",
                "###  ####### # #####",
                "#     #   #  #    X#",
                "##   ##    # #    ##",
                "#   # #      # #   #",
                "#     ##    ##  #  #",
                "# #          ##    #",
                "####################"
            ]
        },
        {
            basePoints: 5,
            thresholds: [19, 29, 40],
            data: [
                '####################',
                '#    #  #      #   #',
                '#   #    #   #     #',
                '# #      ##       ##',
                '#       ##   #     #',
                '#  #      #        #',
                '#     #   ##  # ## #',
                '#         #        #',
                '#  #   # #    #    #',
                '##  #   P#X#O   # ##',
                '#   #    #   ##    #',
                '#      ### #     # #',
                '#  #     #         #',
                '###      #         #',
                '#   # #  ###  #   ##',
                '#    #   # #       #',
                '# # #       #     ##',
                '#  #  # ##     #   #',
                '#O       #   #   # #',
                '####################',
            ],
        },
        {
            basePoints: 5,
            thresholds: [24, 29, 36],
            data: [
                "##############",
                "#$#  $ #    P#",
                "#    #     # #",
                "#     #      #",
                "#     $      #",
                "#        #   #",
                "# # $     #  #",
                "#      #     #",
                "#  #       $ #",
                "## $      #  #",
                "#      #     #",
                "#   #        #",
                "#$  #     #  #",
                "######X#######"
            ],
        },
        {
            name: 'Be Careful',
            basePoints: 12,
            thresholds: [23, 34, 50],
            data: [
                "#########X##########",
                "##    $# $        $#",
                "#$      O          #",
                "#          #       #",
                "#                 ##",
                "#                  #",
                "#                  #",
                "#                  #",
                "#   #              #",
                "#     # #          #",
                "#           #      #",
                "#      #      $    #",
                "#                 ##",
                "#  #          $   O#",
                "#      $ #         #",
                "#       #     #    #",
                "# #                #",
                "#                  #",
                "#        P         #",
                "####################"
            ],
        },
    ];
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
        const otherHole = holes.filter(v => v.x !== player.x && v.y !== player.y)[0];
        placePlayerAt(otherHole.x, otherHole.y);
        standUpright();
    }
    function rockHit() {
        sounds.rock.play();
        standUpright();
    }
    function updateMoveCounter() {
        el.moveCount.title = player.moves.join('');
        el.moveCount.textContent = player.moves.length;
        // el.distance.textContent = player.distance;
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
            sounds.slide.stop();
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
        // console.debug(e);
        if (!DEBUG && e.type === 'keypress' && e.key == 'r' && (e.ctrlKey || e.metaKey)) {
            // prevent reloading of page
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }
        let hasMoved = false;
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
                if (hasMoved && move) {
                    sounds.slide.play();
                    player.moves.push(move);
                }
                break;
            default:
                break;
        }
    }
    function onResetButtonPressed(_e) {
        if (confirm('Do really want to restart this level?')) {
            resetLevel();
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
        state = State.LevelEnd;
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
                        return 'Good job!';
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
        width = level.data[0].length;
        height = level.data.length;
        el.levelNum.textContent = `Level ${level.currentIdx + 1}`;
        player.moves = [];
        player.distance = 0;
        updateMoveCounter();
        el.scene = generateScene();
        el.game.replaceChildren(el.scene, player.el);
        replacePlayerWithIceTile();
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
        state = State.Playing;
        removeOverlay();
        checkAudio();
    }
    function replayLevel() {
        el.replay.addEventListener('click', replayLevel, { capture: true, once: true });
        player.score -= level.score;
        resetLevel();
        play();
    }
    function getLevelScore() {
        return (getNumStars() + 1) * (level.score + LEVELS[level.currentIdx].basePoints);
    }
    function gotoNextLevel() {
        el.proceed.removeEventListener('click', gotoNextLevel);
        player.score += pointsEarned;
        el.totalScore.textContent = player.score;
        ++level.currentIdx;
        localStorage.setItem(STORAGE_KEY.LevelNum, level.currentIdx);
        resetLevel();
        play();
    }
    function showSplashScreen() {
        state = State.SplashScreen;
        const splash = el.splashTemplate.content.cloneNode(true);
        el.overlayBox.replaceChildren(splash);
        el.overlayBox.addEventListener('click', play, { capture: true, once: true });
        showOverlay();
    }
    function resetLevel() {
        exitReached = false;
        level.score = 0;
        el.levelScore.textContent = '0';
        el.totalScore.textContent = player.score;
        let levelData = LEVELS[level.currentIdx].data;
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
        el.totalScore = document.querySelector('#total-score');
        el.levelScore = document.querySelector('#level-score');
        el.levelNum = document.querySelector('#level-num');
        // el.distance = document.querySelector('#distance');
        el.moveCount = document.querySelector('#move-count');
        el.overlay = document.querySelector('#overlay');
        el.overlayBox = document.querySelector('#overlay-box');
        el.restart = document.querySelector('#restart');
        el.restart.addEventListener('click', onResetButtonPressed);
        el.loudspeaker = document.querySelector('#loudspeaker');
        el.loudspeaker.addEventListener('click', checkAudio);
        el.splashTemplate = document.querySelector("#splash");
        el.congratsTemplate = document.querySelector("#congrats");
        player.el = document.createElement('span');
        player.el.className = 'tile penguin';
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
        setupAudio();
        showSplashScreen();
        // if (navigator.userAgent.includes('Mobile')) {
        //     document.querySelector('#controls').classList.remove('hidden');
        // }
        document.querySelector('#controls').classList.remove('hidden');
    }
    window.addEventListener('load', main);
})(window);
