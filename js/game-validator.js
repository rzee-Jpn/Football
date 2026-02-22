```javascript
import { getState, setState } from './game-state.js';
import { setCellClass } from './grid.js';

export function checkAnswers() {
  const state = getState();
  const { words, userGrid } = state;
  const solvedWords = new Set(state.solvedWords);

  words.forEach(word => {
    let isCorrect = true;
    const cells = [];

    for (let i = 0; i < word.word.length; i++) {
      const row = word.dir === 'across' ? word.row : word.row + i;
      const col = word.dir === 'across' ? word.col + i : word.col;
      const cellKey = `${row},${col}`;
      const userLetter = userGrid[cellKey];
      const correctLetter = word.word[i];

      cells.push({ row, col });

      if (!userLetter || userLetter !== correctLetter) {
        isCorrect = false;
      }
    }

    if (isCorrect) {
      solvedWords.add(word.id);
      cells.forEach(cell => {
        setCellClass(cell.row, cell.col, 'correct');
      });
    } else {
      cells.forEach(cell => {
        const cellKey = `${cell.row},${cell.col}`;
        if (userGrid[cellKey]) {
          setCellClass(cell.row, cell.col, 'wrong');
        }
      });
    }
  });

  setState({ solvedWords });
  return { correct: solvedWords.size, total: state.totalWords };
}

export function checkWin() {
  const state = getState();
  if (!state || state.totalWords === 0) return false;
  return state.solvedWords.size === state.totalWords;
}
```