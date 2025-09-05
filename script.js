// script.js の先頭部分 (定数の定義)
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// ↓↓↓ 3つの要素取得を追加 ↓↓↓
const startScreenOverlay = document.getElementById('startScreenOverlay');
const startButton = document.getElementById('startButton');
const gameOverOverlay = document.getElementById('gameOverOverlay');
// ↑↑↑ gameOverOverlayもここでまとめて取得する形に変更 ↑↑↑

const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// (中略) ... この間のコードは変更なし ...

// リスタートボタンのイベントリスナー
restartButton.addEventListener("click", initGame);

// ↓↓↓ ここから追加 ↓↓↓
// スタートボタンのイベントリスナー
startButton.addEventListener('click', () => {
    startScreenOverlay.classList.remove('active'); // スタート画面を非表示にする
    initGame(); // ゲームを開始する
});
// ↑↑↑ ここまで追加 ↑↑↑

// ↓↓↓ ファイルの一番最後の行を削除 ↓↓↓
// initGame(); // この行を削除、またはコメントアウトする