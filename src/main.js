import Phaser from 'phaser';

const config = {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  backgroundColor: '#0f0e0c',
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

let puzzleData = {
  title: "TTS Nusantara",
  words: [
    { id: 1, word: "KUCING", clue: "Hewan peliharaan yang suka mengeong", row: 0, col: 0, dir: "across" },
    { id: 2, word: "KAPAL", clue: "Kendaraan yang berlayar di laut", row: 0, col: 0, dir: "down" },
    { id: 3, word: "ULAR", clue: "Reptil panjang tidak berkaki", row: 0, col: 3, dir: "down" },
    { id: 4, word: "RUMAH", clue: "Tempat berlindung dan tinggal manusia", row: 2, col: 1, dir: "across" },
    { id: 5, word: "ANGIN", clue: "Udara yang bergerak terasa sejuk", row: 2, col: 4, dir: "down" },
    { id: 6, word: "HUJAN", clue: "Air yang turun dari langit", row: 4, col: 0, dir: "across" },
    { id: 7, word: "NASI", clue: "Makanan pokok orang Indonesia", row: 4, col: 2, dir: "down" },
    { id: 8, word: "IKAN", clue: "Hewan air bersirip dan bersisik", row: 6, col: 1, dir: "across" },
    { id: 9, word: "LANGIT", clue: "Hamparan biru di atas kepala kita", row: 6, col: 3, dir: "down" },
    { id: 10, word: "POHON", clue: "Tumbuhan besar yang punya batang keras", row: 8, col: 0, dir: "across" }
  ]
};

let gridSize = 40;
let gridPadding = 10;
let gridGraphics;
let gridCells = [];
let activeWord = null;
let activeCell = null;
let virtualKeyboard;

function preload() {
}

function create() {
  createGrid();
  createVirtualKeyboard();
  createUI();
}

function update() {
}

function createGrid() {
  gridGraphics = this.add.graphics();
  const maxRow = Math.max(...puzzleData.words.map(word => word.dir === 'across' ? word.row : word.row + word.word.length - 1));
  const maxCol = Math.max(...puzzleData.words.map(word => word.dir === 'across' ? word.col + word.word.length - 1 : word.col));
  
  for (let row = 0; row <= maxRow; row++) {
    for (let col = 0; col <= maxCol; col++) {
      const cell = {
        row,
        col,
        letter: '',
        words: [],
        isBlack: true
      };
      
      puzzleData.words.forEach(word => {
        if (word.dir === 'across' && row === word.row && col >= word.col && col < word.col + word.word.length) {
          cell.isBlack = false;
          cell.words.push(word.id);
        }
        if (word.dir === 'down' && col === word.col && row >= word.row && row < word.row + word.word.length) {
          cell.isBlack = false;
          cell.words.push(word.id);
        }
      });
      
      gridCells.push(cell);
    }
  }
  
  drawGrid();
}

function drawGrid() {
  gridGraphics.clear();
  
  gridCells.forEach(cell => {
    const x = cell.col * gridSize + gridPadding;
    const y = cell.row * gridSize + gridPadding;
    
    if (cell.isBlack) {
      gridGraphics.fillStyle(0x000000);
      gridGraphics.fillRect(x, y, gridSize, gridSize);
    } else {
      gridGraphics.fillStyle(0x333333);
      gridGraphics.fillRect(x, y, gridSize, gridSize);
      gridGraphics.lineStyle(1, 0x555555);
      gridGraphics.strokeRect(x, y, gridSize, gridSize);
    }
  });
}

function createVirtualKeyboard() {
  virtualKeyboard = this.add.group();
  const keys = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'];
  
  keys.forEach((key, index) => {
    const x = (index % 10) * 36 + 20;
    const y = Math.floor(index / 10) * 50 + 500;
    const keyText = this.add.text(x, y, key, { font: '24px Arial', fill: '#ffffff' }).setInteractive();
    virtualKeyboard.add(keyText);
  });
}

function createUI() {
  this.add.text(20, 20, puzzleData.title, { font: '32px Arial', fill: '#ffffff' });
}