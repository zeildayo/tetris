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

// ゲームの定数
const ROW = 20;
const COL = 10;
const SQ = 20; // 1ブロックのサイズ(px)
const VACANT = "#0d0d21"; // ボードの背景色

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
let p; // 現在のピース
let nextP; // 次のピース
let gameInterval; // ゲームループのID

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

// ピースを描画/削除するメソッド
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

// ピースを下に移動する
Piece.prototype.moveDown = function() {
    if (!this.collision(0, 1, this.activeTetromino)) {
        this.unDraw();
        this.y++;
        this.draw();
    } else {
        this.lock();
    }
}

// 左右に移動する
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

// 回転する
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

// 衝突判定
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

// ピースをボードに固定する
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
    // そろった行を消す
    for (let r = 0; r < ROW; r++) {
        let isRowFull = true;
        for (let c = 0; c < COL; c++) {
            isRowFull = isRowFull && (board[r][c] != VACANT);
        }
        if (isRowFull) {
            for (let y = r; y > 0; y--) {
                for (let c = 0; c < COL; c++) {
                    board[y][c] = board[y - 1][c];
                }
            }
            for (let c = 0; c < COL; c++) { board[0][c] = VACANT; }
            score += 100;
        }
    }
    drawBoard();
    scoreElement.innerHTML = score;
    
    // ピースを更新
    p = nextP;
    nextP = randomPiece();
    drawNextPiece();
}

// ハードドロップ
Piece.prototype.hardDrop = function() {
    while (!this.collision(0, 1, this.activeTetromino)) {
        this.y++;
    }
    this.lock();
}

// NEXTピースを描画
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

// キーボード操作
function CONTROL(event) {
    if (gameOver) return;
    
    switch (event.keyCode) {
        case 37: p.moveLeft(); break; // 左
        case 38: p.rotate(); break; // 上 (回転)
        case 39: p.moveRight(); break; // 右
        case 40: p.moveDown(); break; // 下
        case 32: // スペース
            event.preventDefault();
            p.hardDrop();
            break;
    }
}

// ゲームループ (ブロック落下)
let dropStart = Date.now();
function drop() {
    let now = Date.now();
    let delta = now - dropStart;
    if (delta > 1000) { // 1秒ごとに落下
        p.moveDown();
        dropStart = Date.now();
    }
    if (!gameOver) {
        gameInterval = requestAnimationFrame(drop);
    }
}

// ゲームの初期化・リスタート関数
function initGame() {
    // ボードをリセット
    for (let r = 0; r < ROW; r++) {
        board[r] = [];
        for (let c = 0; c < COL; c++) {
            board[r][c] = VACANT;
        }
    }
    drawBoard();

    score = 0;
    scoreElement.innerHTML = score;
    gameOver = false;
    gameOverOverlay.classList.remove('active');

    // 最初のピースとNEXTピースをセット
    p = randomPiece();
    nextP = randomPiece();
    drawNextPiece();

    dropStart = Date.now();

    if (gameInterval) cancelAnimationFrame(gameInterval);
    drop();
    
    document.removeEventListener("keydown", CONTROL);
    document.addEventListener("keydown", CONTROL);
}

// イベントリスナーの設定
restartButton.addEventListener("click", initGame);
startButton.addEventListener('click', () => {
    startScreenOverlay.classList.remove('active');
    initGame();
});