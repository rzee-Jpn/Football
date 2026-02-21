```javascript
export class Game {
  constructor(data, onWin) {
    this.words = data.words;
    this.onWin = onWin;
    this.solvedWords = new Set();
    this.activeWord = null;
    this.activeDirection = 'across';
    this.startTime = Date.now();
    this.timer = null;
    this.userInput = {};
    this.correctLetters = {};
    this.initTimer();
  }

  initTimer() {
    this.timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      document.getElementById('timer').textContent = `Waktu: ${elapsed} detik`;
    }, 1000);
  }

  selectCell(row, col) {
    const wordsAtCell = this.getWordsAtPosition(row, col);
    if (wordsAtCell.length === 0) return;

    if (wordsAtCell.length === 1) {
      this.activeWord = wordsAtCell[0];
    } else {
      if (this.activeWord && wordsAtCell.some(w => w.id === this.activeWord.id)) {
        this.activeDirection = this.activeDirection === 'across' ? 'down' : 'across';
        this.activeWord = wordsAtCell.find(w => w.dir === this.activeDirection);
      } else {
        this.activeWord = wordsAtCell[0];
        this.activeDirection = this.activeWord.dir;
      }
    }

    this.highlightActiveWord();
    this.updateClueDisplay();
  }

  getWordsAtPosition(row, col) {
    return this.words.filter(word => {
      if (word.dir === 'across') {
        return word.row === row && col >= word.col && col < word.col + word.word.length;
      } else {
        return word.col === col && row >= word.row && row < word.row + word.word.length;
      }
    });
  }

  highlightActiveWord() {
    document.querySelectorAll('.cell').forEach(cell => {
      cell.classList.remove('active', 'highlighted');
    });

    if (!this.activeWord) return;

    const { row, col, word, dir } = this.activeWord;
    for (let i = 0; i < word.length; i++) {
      const r = dir === 'across' ? row : row + i;
      const c = dir === 'across' ? col + i : col;
      const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
      if (cell) {
        cell.classList.add('highlighted');
        if (i === 0) cell.classList.add('active');
      }
    }
  }

  updateClueDisplay() {
    const clueDisplay = document.getElementById('clue-display');
    if (this.activeWord) {
      clueDisplay.textContent = `${this.activeWord.id}. ${this.activeWord.clue}`;
    } else {
      clueDisplay.textContent = 'Pilih kata untuk melihat petunjuk';
    }
  }

  inputLetter(letter) {
    if (!this.activeWord) return;

    const { row, col, word, dir, id } = this.activeWord;
    const currentPos = this.getCurrentCursorPosition();
    if (!currentPos) return;

    const [r, c] = currentPos;
    this.userInput[`${r},${c}`] = letter.toUpperCase();

    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) {
      cell.textContent = letter.toUpperCase();
      cell.dataset.userInput = letter.toUpperCase();
    }

    this.moveCursorForward();
    this.checkWordCompletion();
  }

  getCurrentCursorPosition() {
    if (!this.activeWord) return null;

    const { row, col, word, dir } = this.activeWord;
    for (let i = 0; i < word.length; i++) {
      const r = dir === 'across' ? row : row + i;
      const c = dir === 'across' ? col + i : col;
      if (!this.userInput[`${r},${c}`]) {
        return [r, c];
      }
    }
    return null;
  }

  moveCursorForward() {
    const currentPos = this.getCurrentCursorPosition();
    if (!currentPos) return;

    const [r, c] = currentPos;
    document.querySelectorAll('.cell').forEach(cell => {
      cell.classList.remove('active');
    });

    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) cell.classList.add('active');
  }

  backspace() {
    if (!this.activeWord) return;

    const currentPos = this.getCurrentCursorPosition();
    if (!currentPos) {
      const { row, col, word, dir } = this.activeWord;
      const lastPos = dir === 'across' ? [row, col + word.length - 1] : [row + word.length - 1, col];
      this.clearCell(...lastPos);
      return;
    }

    const [r, c] = currentPos;
    const prevPos = this.getPreviousCursorPosition(r, c);
    if (prevPos) {
      this.clearCell(...prevPos);
    }
  }

  getPreviousCursorPosition(r, c) {
    const { row, col, word, dir } = this.activeWord;
    if (dir === 'across') {
      if (c > col) return [r, c - 1];
    } else {
      if (r > row) return [r - 1, c];
    }
    return null;
  }

  clearCell(r, c) {
    delete this.userInput[`${r},${c}`];
    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) {
      cell.textContent = '';
      delete cell.dataset.userInput;
      cell.classList.add('active');
    }
  }

  checkAnswers() {
    let allCorrect = true;
    this.words.forEach(word => {
      const isCorrect = this.checkWordCorrectness(word);
      if (isCorrect) {
        this.solvedWords.add(word.id);
      } else {
        allCorrect = false;
      }
    });

    this.updateProgress();
    if (allCorrect && this.words.length > 0) {
      this.handleWin();
    }
  }

  checkWordCorrectness(word) {
    let isCorrect = true;
    const { row, col, word: solution, dir } = word;

    for (let i = 0; i < solution.length; i++) {
      const r = dir === 'across' ? row : row + i;
      const c = dir === 'across' ? col + i : col;
      const userLetter = this.userInput[`${r},${c}`];
      const correctLetter = solution[i];

      const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
      if (cell) {
        if (userLetter === correctLetter) {
          cell.classList.add('correct');
          cell.classList.remove('wrong');
          this.correctLetters[`${r},${c}`] = true;
        } else if (userLetter) {
          cell.classList.add('wrong');
          cell.classList.remove('correct');
          isCorrect = false;
        } else {
          cell.classList.remove('correct', 'wrong');
          isCorrect = false;
        }
      }
    }

    return isCorrect;
  }

  checkWordCompletion() {
    if (!this.activeWord) return;

    const isComplete = this.checkWordCorrectness(this.activeWord);
    if (isComplete) {
      this.solvedWords.add(this.activeWord.id);
      this.updateProgress();
      if (this.solvedWords.size === this.words.length) {
        this.handleWin();
      }
    }
  }

  updateProgress() {
    const progress = document.getElementById('progress');
    progress.textContent = `${this.solvedWords.size}/${this.words.length} kata`;
  }

  getHint() {
    if (!this.activeWord) return;

    const { row, col, word, dir } = this.activeWord;
    for (let i = 0; i < word.length; i++) {
      const r = dir === 'across' ? row : row + i;
      const c = dir === 'across' ? col + i : col;
      if (!this.userInput[`${r},${c}`] && !this.correctLetters[`${r},${c}`]) {
        this.userInput[`${r},${c}`] = word[i];
        const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
        if (cell) {
          cell.textContent = word[i];
          cell.dataset.userInput = word[i];
          cell.classList.add('correct');
        }
        this.checkWordCompletion();
        break;
      }
    }
  }

  reset() {
    this.userInput = {};
    this.correctLetters = {};
    this.solvedWords = new Set();
    document.querySelectorAll('.cell').forEach(cell => {
      cell.textContent = '';
      delete cell.dataset.userInput;
      cell.classList.remove('active', 'highlighted', 'correct', 'wrong');
    });
    this.updateProgress();
  }

  loadData(newData) {
    this.words = newData.words;
    this.reset();
    document.getElementById('header h1').textContent = newData.title;
  }

  handleWin() {
    clearInterval(this.timer);
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    if (this.onWin) {
      this.onWin(elapsed);
    }
  }
}
```