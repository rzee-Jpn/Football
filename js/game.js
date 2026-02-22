```javascript
import { initState, getState, setState } from './game-state.js';
import { selectCell as selectCellAction, inputLetter as inputLetterAction, backspace as backspaceAction, getHint as getHintAction } from './game-actions.js';
import { checkAnswers as checkAnswersValidator, checkWin as checkWinValidator } from './game-validator.js';
import { renderGrid, clearAllClasses } from './grid.js';
import { validateData } from './data.js';

export class CrosswordGame {
  constructor(words, callbacks) {
    this.words = words;
    this.callbacks = callbacks;
    initState(words);
  }

  selectCell(row, col) {
    const clue = selectCellAction(row, col);
    const state = getState();
    if (state.activeWordId) {
      const activeWord = this.words.find(word => word.id === state.activeWordId);
      return activeWord.clue;
    }
    return clue;
  }

  inputLetter(letter) {
    inputLetterAction(letter);
  }

  backspace() {
    backspaceAction();
  }

  checkAnswers() {
    const result = checkAnswersValidator();
    this.callbacks.onProgress(result);
    if (checkWinValidator()) {
      const elapsed = Date.now() - getState().startTime;
      this.callbacks.onWin(elapsed);
    }
  }

  getHint() {
    getHintAction();
  }

  reset() {
    initState(this.words);
    clearAllClasses();
  }

  loadNewData(data) {
    validateData(data);
    this.words = data.words;
    this.reset();
    renderGrid('grid-container', this.words, (row, col) => {
      const clue = this.selectCell(row, col);
      document.getElementById('clue-banner').textContent = clue;
    });
  }
}
```