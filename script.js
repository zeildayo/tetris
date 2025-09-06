// キャンバス要素を取得
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');

let isPaused = false; // ポーズ状態を管理

// ゲームの基本設定
const COLS = 10; // 横のマス数
const ROWS = 20; // 縦のマス数
const BLOCK_SIZE = 30; // 1マスのサイズ

// キャンバスのサイズを更新
ctx.canvas.width = COLS * BLOCK_SIZE;
ctx.canvas.height = ROWS * BLOCK_SIZE;

// ブロックのパステルカラー
const COLORS = [
    null,       // 0番目は空マスなのでnull
    '#FFADAD', // 1: 薄い赤
    '#FFD6A5', // 2: 薄いオレンジ
    '#FDFFB6', // 3: レモンイエロー
    '#CAFFBF', // 4: ミントグリーン
    '#9BF6FF', // 5: スカイブルー
    '#A0C4FF', // 6: 薄い青
    '#BDB2FF'  // 7: ラベンダー
];

// テトリミノ（ブロック）の形を定義
function createPiece(type) {
    if (type === 'T') {
        return [[0, 1, 0], [1, 1, 1], [0, 0, 0]];
    } else if (type === 'O') {
        return [[2, 2], [2, 2]];
    } else if (type === 'L') {
        return [[0, 3, 0], [0, 3, 0], [0, 3, 3]];
    } else if (type === 'J') {
        return [[0, 4, 0], [0, 4, 0], [4, 4, 0]];
    } else if (type === 'I') {
        return [[0, 0, 0, 0], [5, 5, 5, 5], [0, 0, 0, 0], [0, 0, 0, 0]];
    } else if (type === 'S') {
        return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
    } else if (type === 'Z') {
        return [[7, 7, 0], [0, 7, 7], [0, 0, 0]];
    }
}

// ゲーム盤の状態を管理する2次元配列
let board = createBoard();

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// プレイヤー（操作中のブロック）の状態
const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
};

// --- ゲームロジック ---

// ブロックを盤面に固定する
function merge() {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

// 衝突判定
function collide() {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// 新しいブロックを生成してリセット
function playerReset() {
    const pieces = 'ILJOTSZ';
    player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
    // ゲームオーバー判定
    if (collide()) {
        board.forEach(row => row.fill(0)); // 盤面をリセット
        player.score = 0;
        alert('ゲームオーバー！');
    }
}

// ブロックを下に落とす
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

// ハードドロップ（スペースキー）
function playerHardDrop() {
    while (!collide()) {
        player.pos.y++;
    }
    player.pos.y--;
    merge();
    sweepLines();
    playerReset();
    dropCounter = 0;
}

// 左右に移動
function playerMove(dir) {
    player.pos.x += dir;
    if (collide()) {
        player.pos.x -= dir;
    }
}

// ブロックの回転
function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    // 壁にぶつかったら補正する（ウォールキック）
    while (collide()) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

// ラインが揃ったら消す
function sweepLines() {
    let clearedLines = 0;
    outer: for (let y = board.length - 1; y > 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;
        clearedLines++;
    }
    // スコア計算
    if (clearedLines > 0) {
        player.score += clearedLines * 100 * clearedLines; // 消したライン数に応じてスコアアップ
    }
}

// --- 描画処理 ---

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(x + offset.x, y + offset.y, COLORS[value]);
            }
        });
    });
}

function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    const padding = 2;
    ctx.beginPath();
    ctx.roundRect(
        x * BLOCK_SIZE + padding,
        y * BLOCK_SIZE + padding,
        BLOCK_SIZE - padding * 2,
        BLOCK_SIZE - padding * 2,
        [5]
    );
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.roundRect(
        x * BLOCK_SIZE + padding + 2,
        y * BLOCK_SIZE + padding + 2,
        (BLOCK_SIZE - padding * 2) / 2,
        (BLOCK_SIZE - padding * 2) / 2,
        [3]
    );
    ctx.fill();
}

function draw() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(board, {x: 0, y: 0});
    drawMatrix(player.matrix, player.pos);
}

// --- ゲームループ ---

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let animationId;

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    animationId = requestAnimationFrame(update);
}

// --- 操作 ---

document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();

    if (key === 'escape') {
        isPaused = !isPaused;
        if (isPaused) {
            cancelAnimationFrame(animationId);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = 'bold 40px "Arial Rounded MT Bold"';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        } else {
            update();
        }
        return;
    }

    if (isPaused) return;

    if (key === 'arrowleft' || key === 'a') {
        playerMove(-1);
    } else if (key === 'arrowright' || key === 'd') {
        playerMove(1);
    } else if (key === 'arrowdown' || key === 's') {
        playerDrop();
    } else if (key === 'arrowup' || key === 'w') {
        playerRotate(1);
    } else if (key === ' ') {
        event.preventDefault();
        playerHardDrop();
    }
});

// --- ゲーム開始 ---
playerReset();
update();