// ----- DOM要素の取得 -----
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const startButton = document.getElementById('start-button');
const gameOverlay = document.getElementById('game-overlay');
const pauseText = document.getElementById('pause-text');
const instructions = document.getElementById('instructions');

// ----- ゲームの基本設定 -----
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_CANVAS_BLOCK_SIZE = 20;
const LOCK_DELAY = 500;
const INFINITY_LIMIT = 15;

// キャンバスのサイズを設定
ctx.canvas.width = COLS * BLOCK_SIZE;
ctx.canvas.height = ROWS * BLOCK_SIZE;

// ----- ゲームの状態管理 -----
let board = createBoard();
let isPaused = false;
let isGameOver = false;
let animationId;
let lockDelayTimer;
let moveCount;
let holdPiece = null;
let canHold = true;

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    nextMatrix: null,
    score: 0,
    lines: 0,
};

// ----- 色と形の定義 -----
const COLORS = [ null, '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF' ];
const PIECES = 'ILJOTSZ';

function createPiece(type) {
    if (type === 'T') return [[0, 1, 0], [1, 1, 1], [0, 0, 0]];
    if (type === 'O') return [[2, 2], [2, 2]];
    if (type === 'L') return [[0, 3, 0], [0, 3, 0], [0, 3, 3]];
    if (type === 'J') return [[0, 4, 0], [0, 4, 0], [4, 4, 0]];
    if (type === 'I') return [[0,0,0,0], [5,5,5,5], [0,0,0,0], [0,0,0,0]];
    if (type === 'S') return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
    if (type === 'Z') return [[7, 7, 0], [0, 7, 7], [0, 0, 0]];
}

// ----- ゲームロジック -----
function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function collide(board, piece) {
    const [m, o] = [piece.matrix, piece.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function playerReset(consumeNext = true) {
    if (consumeNext) {
        player.matrix = player.nextMatrix || createPiece(PIECES[PIECES.length * Math.random() | 0]);
        player.nextMatrix = createPiece(PIECES[PIECES.length * Math.random() | 0]);
    } else {
        player.matrix = createPiece(PIECES[PIECES.length * Math.random() | 0]);
    }
    
    player.pos.y = 0;
    player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
    moveCount = 0;
    resetHold();
    drawNextPiece();
    if (collide(board, player)) {
        isGameOver = true;
        gameOverlay.style.display = 'flex';
        startButton.textContent = 'RESTART';
        startButton.style.display = 'block';
        instructions.style.display = 'none';
        pauseText.style.display = 'none';
        alert('GAME OVER');
    }
}

function merge() {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function sweepLines() {
    let clearedLines = 0;
    outer: for (let y = board.length - 1; y > 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) continue outer;
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;
        clearedLines++;
    }
    if (clearedLines > 0) {
        player.lines += clearedLines;
        player.score += clearedLines * 100 * clearedLines;
        updateUI();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
        player.pos.y--;
        if (!lockDelayTimer) {
            lockDelayTimer = setTimeout(forceLock, LOCK_DELAY);
        }
    } else {
        clearTimeout(lockDelayTimer);
        lockDelayTimer = null;
    }
    dropCounter = 0;
}

function forceLock() {
    player.pos.y++;
    if(collide(board, player)) {
        player.pos.y--;
        merge();
        sweepLines();
        playerReset();
    } else {
        player.pos.y--;
    }
    clearTimeout(lockDelayTimer);
    lockDelayTimer = null;
}

function playerHardDrop() {
    while (!collide(board, player)) player.pos.y++;
    player.pos.y--;
    merge();
    sweepLines();
    playerReset();
    dropCounter = 0;
    clearTimeout(lockDelayTimer);
    lockDelayTimer = null;
}

function handleMove() {
    if (lockDelayTimer && moveCount < INFINITY_LIMIT) {
        clearTimeout(lockDelayTimer);
        lockDelayTimer = setTimeout(forceLock, LOCK_DELAY);
        moveCount++;
    }
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(board, player)) {
        player.pos.x -= dir;
    } else {
        handleMove();
    }
}

function rotate(matrix) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    matrix.forEach(row => row.reverse());
}

function playerRotate() {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix);
    while (collide(board, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix);
            rotate(player.matrix);
            rotate(player.matrix);
            player.pos.x = pos;
            return;
        }
    }
    handleMove();
}

// ----- 描画処理 -----
function drawMatrix(matrix, offset, blockSize, context, isGhost = false) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const color = COLORS[value];
                const drawX = (x + offset.x) * blockSize;
                const drawY = (y + offset.y) * blockSize;
                const padding = 2;

                if (isGhost) {
                    context.strokeStyle = color;
                    context.lineWidth = 2;
                    context.beginPath();
                    context.roundRect(drawX + padding, drawY + padding, blockSize - padding * 2, blockSize - padding * 2, [5]);
                    context.stroke();
                } else {
                    context.fillStyle = color;
                    context.beginPath();
                    context.roundRect(drawX + padding, drawY + padding, blockSize - padding * 2, blockSize - padding * 2, [5]);
                    context.fill();
                }
            }
        });
    });
}

function drawGrid(context) {
    context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    context.lineWidth = 1;
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
    }
}

function getGhostPosition() {
    const ghost = { ...player, pos: { ...player.pos } };
    while (!collide(board, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;
    return ghost.pos;
}

function draw() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx);

    const ghostPos = getGhostPosition();
    if (player.pos.y < ghostPos.y) {
        drawMatrix(player.matrix, ghostPos, BLOCK_SIZE, ctx, true);
    }
    
    drawMatrix(board, {x: 0, y: 0}, BLOCK_SIZE, ctx);
    drawMatrix(player.matrix, player.pos, BLOCK_SIZE, ctx);
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    const piece = player.nextMatrix;
    if (!piece) return;

    let minX = piece[0].length, maxX = -1, minY = piece.length, maxY = -1;
    for(let y = 0; y < piece.length; y++) {
        for(let x = 0; x < piece[y].length; x++) {
            if (piece[y][x] !== 0) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }
    const pieceWidth = (maxX - minX + 1);
    const pieceHeight = (maxY - minY + 1);

    const blockSize = NEXT_CANVAS_BLOCK_SIZE;
    const canvasSize = nextCanvas.width;
    
    const offsetX = (canvasSize / blockSize - pieceWidth) / 2 - minX;
    const offsetY = (canvasSize / blockSize - pieceHeight) / 2 - minY;
    
    drawMatrix(piece, {x: offsetX, y: offsetY}, blockSize, nextCtx);
}

// ----- ホールド機能関連の関数 -----
function drawHoldPiece() {
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    holdCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);

    if (holdPiece) {
        const piece = holdPiece;
        let minX = piece[0].length, maxX = -1, minY = piece.length, maxY = -1;
        for(let y = 0; y < piece.length; y++) {
            for(let x = 0; x < piece[y].length; x++) {
                if (piece[y][x] !== 0) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        const pieceWidth = (maxX - minX + 1);
        const pieceHeight = (maxY - minY + 1);
        const blockSize = NEXT_CANVAS_BLOCK_SIZE;
        const canvasSize = holdCanvas.width;
        const offsetX = (canvasSize / blockSize - pieceWidth) / 2 - minX;
        const offsetY = (canvasSize / blockSize - pieceHeight) / 2 - minY;
        drawMatrix(piece, {x: offsetX, y: offsetY}, blockSize, holdCtx);
    }
}

function doHold() {
    if (!canHold) return;
    if (holdPiece) {
        [player.matrix, holdPiece] = [holdPiece, player.matrix];
        player.pos.y = 0;
        player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
    } else {
        holdPiece = player.matrix;
        playerReset();
    }
    drawHoldPiece();
    canHold = false;
}

function resetHold() {
    canHold = true;
}

function updateUI() {
    scoreElement.textContent = player.score;
    linesElement.textContent = player.lines;
}

// ----- ゲームループ -----
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
    if (isGameOver) return;
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval && !lockDelayTimer) {
        playerDrop();
    }
    draw();
    animationId = requestAnimationFrame(update);
}

// ----- イベントリスナー -----
function startGame() {
    isGameOver = false;
    isPaused = false;
    board = createBoard();
    player.score = 0;
    player.lines = 0;
    holdPiece = null;
    canHold = true;
    updateUI();
    drawHoldPiece();
    playerReset();
    gameOverlay.style.display = 'none';
    instructions.style.display = 'none';
    clearTimeout(lockDelayTimer);
    lockDelayTimer = null;
    update();
}

startButton.addEventListener('click', startGame);

document.addEventListener('keydown', event => {
    if (isGameOver && event.key.toLowerCase() !== 'escape') return;