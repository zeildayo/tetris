// script.jsの先頭に追加したテトロミノの形状データはそのまま

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverOverlay = document.getElementById('gameOverOverlay'); // 追加
const finalScoreElement = document.getElementById('finalScore');     // 追加
const restartButton = document.getElementById('restartButton');     // 追加

const ROW = 20;
const COL = 10;
const SQ = 20; // Square size
// VACANTの色を少し調整して、ボード背景色と差をつける
const VACANT = "#0d0d21"; // Changed to match game-board-bg

// Draw a square
function drawSquare(x, y, color) {
    context.fillStyle = color;
    context.fillRect(x * SQ, y * SQ, SQ, SQ);
    context.strokeStyle = "#1a1a2e"; // 枠線の色を調整
    context.lineWidth = 1; // 枠線の太さ
    context.strokeRect(x * SQ, y * SQ, SQ, SQ);
}

// ... (drawBoard, PIECES, randomPiece, Piece constructor, fill, draw, unDraw, moveDown, moveRight, moveLeft, rotate はそのまま)

let score = 0;
let dropStart = Date.now();
let gameOver = false;
let gameInterval; // ゲームループのインターバルIDを保持するための変数

Piece.prototype.lock = function() {
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino.length; c++) {
            if (!this.activeTetromino[r][c]) continue;
            if (this.y + r < 0) {
                // ゲームオーバー処理
                gameOver = true;
                finalScoreElement.textContent = score; // 最終スコアを表示
                gameOverOverlay.classList.add('active'); // ゲームオーバーオーバーレイを表示
                // alert("Game Over"); // alertは削除
                clearInterval(gameInterval); // ゲームループを停止
                document.removeEventListener("keydown", CONTROL); // キー入力を無効化
                return; // これ以上処理しない
            }
            board[this.y + r][this.x + c] = this.color;
        }
    }
    // Remove full rows
    for (let r = 0; r < ROW; r++) {
        let isRowFull = true;
        for (let c = 0; c < COL; c++) {
            isRowFull = isRowFull && (board[r][c] != VACANT);
        }
        if (isRowFull) {
            for (let y = r; y > 0; y--) { // y > 0 に修正 (最上段までコピー)
                for (let c = 0; c < COL; c++) {
                    board[y][c] = board[y - 1][c];
                }
            }
            for (let c = 0; c < COL; c++) { // 最上段をVACANTで埋める
                board[0][c] = VACANT;
            }
            score += 100; // スコアを少し上げた
        }
    }
    drawBoard();
    scoreElement.innerHTML = score;
    p = randomPiece(); // 次のピースを生成
}

Piece.prototype.collision = function(x, y, piece) {
    for (let r = 0; r < piece.length; r++) {
        for (let c = 0; c < piece.length; c++) {
            if (!piece[r][c]) continue;
            let newX = this.x + c + x;
            let newY = this.y + r + y;
            if (newX < 0 || newX >= COL || newY >= ROW) return true;
            // newY < 0 の場合は衝突判定をスキップしない (ゲームボード外のピースは衝突しないが、ロック時には必要)
            if (newY >= 0 && board[newY][newX] != VACANT) return true; // newYがボード範囲内かチェック
        }
    }
    return false;
}

// Control the piece
document.addEventListener("keydown", CONTROL);

function CONTROL(event) {
    if (gameOver) return; // ゲームオーバー時は操作を受け付けない
    if (event.keyCode == 37) {
        p.moveLeft();
        dropStart = Date.now(); // 操作したらドロップタイマーをリセット
    } else if (event.keyCode == 38) {
        p.rotate();
        dropStart = Date.Now();
    } else if (event.keyCode == 39) {
        p.moveRight();
        dropStart = Date.now();
    } else if (event.keyCode == 40) {
        p.moveDown();
    }
}

// Drop the piece every 1 sec
function drop() {
    let now = Date.now();
    let delta = now - dropStart;
    if (delta > 1000) { // 落下速度
        p.moveDown();
        dropStart = Date.now();
    }
    if (!gameOver) {
        gameInterval = requestAnimationFrame(drop); // gameIntervalにIDを保存
    }
}

// ゲームの初期化とリスタート
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
    gameOverOverlay.classList.remove('active'); // オーバーレイを非表示に

    p = randomPiece(); // 最初のピースを生成
    dropStart = Date.now();

    // 既存のゲームループがあれば停止
    if (gameInterval) {
        cancelAnimationFrame(gameInterval);
    }
    // 新しいゲームループを開始
    drop();
    // キーボードイベントリスナーを再登録（ゲームオーバー時に削除されるため）
    document.removeEventListener("keydown", CONTROL); // 重複登録を防ぐ
    document.addEventListener("keydown", CONTROL);
}

// リスタートボタンのイベントリスナー
restartButton.addEventListener("click", initGame);

// 初回ゲーム開始
initGame();