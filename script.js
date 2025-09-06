// ----- DOM要素の取得 -----
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const startButton = document.getElementById('start-button');
const gameOverlay = document.getElementById('game-overlay');
const pauseText = document.getElementById('pause-text');

// ----- ゲームの基本設定 -----
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_CANVAS_BLOCK_SIZE = 20;

// キャンバスのサイズを設定
ctx.canvas.width = COLS * BLOCK_SIZE;
ctx.canvas.height = ROWS * BLOCK_SIZE;

// ----- ゲームの状態管理 -----
let board = createBoard();
let isPaused = false;
let isGameOver = false;
let animationId;

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

function playerReset() {
    player.matrix = player.nextMatrix || createPiece(PIECES[PIECES.length * Math.random() | 0]);
    player.nextMatrix = createPiece(PIECES[PIECES.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
    drawNextPiece();

    if (collide()) {
        isGameOver = true;
        gameOverlay.style.display = 'flex';
        startButton.textContent = 'RESTART';
        startButton.style.display = 'block';
        pauseText.style.display = 'none';
        alert('GAME OVER');
    }
}

function collide() {
    for (let y = 0; y < player.matrix.length; ++y) {
        for (let x = 0; x < player.matrix[y].length; ++x) {
            if (player.matrix[y][x] !== 0 && (board[y + player.pos.y] && board[y + player.pos.y][x + player.pos.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
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
    if (collide()) {
        player.pos.y--;
        merge();
        sweepLines();
        playerReset();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide()) player.pos.y++;
    player.pos.y--;
    merge();
    sweepLines();
    playerReset();
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide()) player.pos.x -= dir;
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
    while (collide()) {
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
}

// ----- 描画処理 -----
function drawBlock(matrix, offset, blockSize, context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = COLORS[value];
                const padding = 2;
                context.beginPath();
                context.roundRect(
                    (x + offset.x) * blockSize + padding,
                    (y + offset.y) * blockSize + padding,
                    blockSize - padding * 2,
                    blockSize - padding * 2,
                    [5]
                );
                context.fill();
            }
        });
    });
}

function draw() {
    // 盤面の背景色を黒に変更
    ctx.fillStyle = '#000000'; // 黒色
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBlock(board, {x: 0, y: 0}, BLOCK_SIZE, ctx);
    drawBlock(player.matrix, player.pos, BLOCK_SIZE, ctx);
}

function drawNextPiece() {
    nextCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    const piece = player.nextMatrix;
    const offsetX = (nextCanvas.width / NEXT_CANVAS_BLOCK_SIZE - piece[0].length) / 2;
    const offsetY = (nextCanvas.height / NEXT_CANVAS_BLOCK_SIZE - piece.length) / 2;
    drawBlock(piece, {x: offsetX, y: offsetY}, NEXT_CANVAS_BLOCK_SIZE, nextCtx);
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
    if (dropCounter > dropInterval) playerDrop();
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
    updateUI();
    playerReset();
    gameOverlay.style.display = 'none';
    update();
}

startButton.addEventListener('click', startGame);

document.addEventListener('keydown', event => {
    if (isGameOver) return;
    const key = event.key.toLowerCase();

    if (key === 'escape') {
        isPaused = !isPaused;
        if (isPaused) {
            cancelAnimationFrame(animationId);
            gameOverlay.style.display = 'flex';
            startButton.style.display = 'none';
            pauseText.style.display = 'block';
        } else {
            gameOverlay.style.display = 'none';
            update();
        }
        return;
    }

    if (isPaused) return;

    if (key === 'arrowleft' || key === 'a') playerMove(-1);
    else if (key === 'arrowright' || key === 'd') playerMove(1);
    else if (key === 'arrowdown' || key === 's') playerDrop();
    else if (key === 'arrowup' || key === 'w') playerRotate();
    else if (key === ' ') {
        event.preventDefault();
        playerHardDrop();
    }
});