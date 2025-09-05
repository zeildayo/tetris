// HTML要素の取得
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startScreenOverlay = document.getElementById('startScreenOverlay');
const startButton = document.getElementById('startButton');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const nextCanvas = document.getElementById('next-piece');
const nextContext = nextCanvas.getContext('2d');
const levelElement = document.getElementById('level'); // ▼ 追加
const linesElement = document.getElementById('lines'); // ▼ 追加

// ゲームの定数
const ROW = 20;
const COL = 10;
const SQ = 20;
const VACANT = "#0d0d21";

// テトリミノの形状データ
const Z = [ [[1,1,0], [0,1,1], [0,0,0]], [[0,1,0], [1,1,0], [1,0,0]] ];
const S = [ [[0,1,1], [1,1,0], [0,0,0]], [[1,0,0], [1,1,0], [0,1,0]] ];
const T = [ [[0,1,0], [1,1,1], [0,0,0]], [[0,1,0], [0,1,1], [0,1,0]], [[0,0,0], [1,1,1], [0,1,0]], [[0,1,0], [1,1,0], [0,1,0]] ];
const O = [ [[1,1], [1,1]] ];
const L = [ [[0,0,1], [1,1,1], [0,0,0]], [[0,1,0], [0,1,0], [0,1,1]], [[0,0,0], [1,1,1], [1,0,0]], [[1,1,0], [0,1,0], [0,1,0]] ];
const I = [ [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]] ];
const J = [ [[1,0,0], [1,1,1], [0,0,0]], [[0,1,1], [0,1,0], [0,1,0]], [[0,0,0], [1,1,1], [0,0,1]], [[0,1,0], [0,1,0], [1,1,0]] ];
const PIECES = [ [Z, "red"], [S, "green"], [T, "yellow"], [O, "blue"], [L, "purple"], [I, "cyan"], [J, "orange"] ];

// ゲームの状態を保持する変数
let board = [];
let score = 0;
let gameOver = false;
let p;
let nextP;
let gameInterval;
let level = 1; // ▼ 追加
let lines = 0; // ▼ 追加
let dropInterval; // ▼ 追加

// 1マス描画する関数
function drawSquare(x, y, color) {
    context.fillStyle = color;
    context.fillRect(x * SQ, y * SQ, SQ, SQ);
    context.strokeStyle = "#1a1a2e";
    context.lineWidth = 1;
    context.strokeRect(x * SQ, y * SQ, SQ, SQ);
}

// ボードを描画する関数
function drawBoard() {
    for (let r = 0; r < ROW; r++) {
        for (let c = 0; c < COL; c++) {
            drawSquare(c, r, board[r][c]);
        }
    }
}

// ピースオブジェクトの定義
function Piece(tetromino, color) {
    this.tetromino = tetromino;
    this.color = color;
    this.tetrominoN = 0;
    this.activeTetromino = this.tetromino[this.tetrominoN];
    this.x = 3;
    this.y = -2;
}

// 新しいピースをランダムに生成する
function randomPiece() {
    let r = Math.floor(Math.random() * PIECES.length);
    return new Piece(PIECES[r][0], PIECES[r][1]);
}

Piece.prototype.fill = function(color) {
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino.length; c++) {
            if (this.activeTetromino[r][c]) {
                drawSquare(this.x + c, this.y + r, color);
            }
        }
    }
}
Piece.prototype.draw = function() { this.fill(this.color); }
Piece.prototype.unDraw = function() { this.fill(VACANT); }

Piece.prototype.moveDown = function() {
    if (!this.collision(0, 1, this.activeTetromino)) {
        this.unDraw();
        this.y++;
        this.draw();
    } else {
        this.lock();
    }
}

Piece.prototype.moveRight = function() {
    if (!this.collision(1, 0, this.activeTetromino)) {
        this.unDraw();
        this.x++;
        this.draw();
    }
}
Piece.prototype.moveLeft = function() {
    if (!this.collision(-1, 0, this.activeTetromino)) {
        this.unDraw();
        this.x--;
        this.draw();
    }
}

Piece.prototype.rotate = function() {
    let nextPattern = this.tetromino[(this.tetrominoN + 1) % this.tetromino.length];
    let kick = 0;
    if (this.collision(0, 0, nextPattern)) {
        if (this.x > COL / 2) kick = -1; else kick = 1;
    }
    if (!this.collision(kick, 0, nextPattern)) {
        this.unDraw();
        this.x += kick;
        this.tetrominoN = (this.tetrominoN + 1) % this.tetromino.length;
        this.activeTetromino = this.tetromino[this.tetrominoN];
        this.draw();
    }
}

Piece.prototype.collision = function(x, y, piece) {
    for (let r = 0; r < piece.length; r++) {
        for (let c = 0; c < piece.length; c++) {
            if (!piece[r][c]) continue;
            let newX = this.x + c + x;
            let newY = this.y + r + y;
            if (newX < 0 || newX >= COL || newY >= ROW) return true;
            if (newY < 0) continue;
            if (board[newY][newX] != VACANT) return true;
        }
    }
    return false;
}

// ▼▼▼ lock関数を更新 ▼▼▼
Piece.prototype.lock = function() {
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino.length; c++) {
            if (!this.activeTetromino[r][c]) continue;
            if (this.y + r < 0) {
                gameOver = true;
                finalScoreElement.textContent = score;
                gameOverOverlay.classList.add('active');
                cancelAnimationFrame(gameInterval);
                document.removeEventListener("keydown", CONTROL);
                return;
            }
            board[this.y + r][this.x + c] = this.color;
        }
    }
    
    let linesCleared = 0;
    for (let r = 0; r < ROW; r++) {
        let isRowFull = true;
        for (let c = 0; c < COL; c++) {
            isRowFull = isRowFull && (board[r][c] != VACANT);
        }
        if (isRowFull) {
            linesCleared++;
            for (let y = r; y > 0; y--) {
                for (let c = 0; c < COL; c++) {
                    board[y][c] = board[y - 1][c];
                }
            }
            for (let c = 0; c < COL; c++) { board[0][c] = VACANT; }
            score += 100;
        }
    }

    if(linesCleared > 0){
        lines += linesCleared;
        if(Math.floor(lines / 10) >= level){
            level++;
            // レベルが上がると落下速度を速くする (最小100ms)
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        }
    }

    drawBoard();
    scoreElement.innerHTML = score;
    levelElement.innerHTML = level;
    linesElement.innerHTML = lines;
    
    p = nextP;
    nextP = randomPiece();
    drawNextPiece();
}

Piece.prototype.hardDrop = function() {
    while (!this.collision(0, 1, this.activeTetromino)) {
        this.y++;
    }
    this.lock();
}

function drawNextPiece() {
    nextContext.fillStyle = VACANT;
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    const piece = nextP.tetromino[0];
    const color = nextP.color;
    const pieceSize = piece.length;
    const sqSize = 20;

    const offsetX = (nextCanvas.width - pieceSize * sqSize) / 2;
    const offsetY = (nextCanvas.height - pieceSize * sqSize) / 2;

    for (let r = 0; r < pieceSize; r++) {
        for (let c = 0; c < pieceSize; c++) {
            if (piece[r][c]) {
                nextContext.fillStyle = color;
                nextContext.fillRect(offsetX + c * sqSize, offsetY + r * sqSize, sqSize, sqSize);
                nextContext.strokeStyle = "#1a1a2e";
                nextContext.strokeRect(offsetX + c * sqSize, offsetY + r * sqSize, sqSize, sqSize);
            }
        }
    }
}

function CONTROL(event) {
    if (gameOver) return;
    switch (event.keyCode) {
        case 37: p.moveLeft(); break;
        case 38: p.rotate(); break;
        case 39: p.moveRight(); break;
        case 40: p.moveDown(); break;
        case 32: event.preventDefault(); p.hardDrop(); break;
    }
}

// ▼▼▼ drop関数を更新 ▼▼▼
let dropStart = Date.now();
function drop() {
    let now = Date.now();
    let delta = now - dropStart;
    if (delta > dropInterval) { // 固定値から変数に変更
        p.moveDown();
        dropStart = Date.now();
    }
    if (!gameOver) {
        gameInterval = requestAnimationFrame(drop);
    }
}

// ▼▼▼ initGame関数を更新 ▼▼▼
function initGame() {
    for (let r = 0; r < ROW; r++) {
        board[r] = [];
        for (let c = 0; c < COL; c++) {
            board[r][c] = VACANT;
        }
    }
    drawBoard();

    score = 0;
    scoreElement.innerHTML = score;
    level = 1;
    levelElement.innerHTML = level;
    lines = 0;
    linesElement.innerHTML = lines;
    dropInterval = 1000; // 落下速度を初期化

    gameOver = false;
    gameOverOverlay.classList.remove('active');

    p = randomPiece();
    nextP = randomPiece();
    drawNextPiece();

    dropStart = Date.now();

    if (gameInterval) cancelAnimationFrame(gameInterval);
    drop();
    
    document.removeEventListener("keydown", CONTROL);
    document.addEventListener("keydown", CONTROL);
}

restartButton.addEventListener("click", initGame);
startButton.addEventListener('click', () => {
    startScreenOverlay.classList.remove('active');
    initGame();
});