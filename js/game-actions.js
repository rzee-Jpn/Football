```javascript
import { getState, setState } from './game-state.js';
import { setCellLetter, setCellClass, clearAllClasses } from './grid.js';

export function selectCell(row, col) {
  const state = getState();
  const { words, userGrid } = state;
  
  let activeWord = null;
  let activeCells = [];
  let activeCursor = 0;

  // Find intersecting words at this cell
  const intersectingWords = words.filter(word => {
    if (word.dir === 'across') {
      return word.row === row && col >= word.col && col < word.col + word.word.length;
    } else {
      return word.col === col && row >= word.row && row < word.row + word.word.length;
    }
  });

  // If multiple words, toggle direction
  if (intersectingWords.length > 1) {
    const currentWord = words.find(w => w.id === state.activeWordId);
    if (currentWord && intersectingWords.some(w => w.id === currentWord.id)) {
      activeWord = intersectingWords.find(w => w.id !== currentWord.id);
    } else {
      activeWord = intersectingWords[0];
    }
  } else {
    activeWord = intersectingWords[0];
  }

  if (!activeWord) return null;

  // Build active cells array
  for (let i = 0; i < activeWord.word.length; i++) {
    const r = activeWord.dir === 'across' ? activeWord.row : activeWord.row + i;
    const c = activeWord.dir === 'across' ? activeWord.col + i : activeWord.col;
    activeCells.push({ row: r, col: c });
  }

  // Find cursor position
  activeCursor = activeCells.findIndex(cell => 
    !userGrid[`${cell.row},${cell.col}`]
  );
  if (activeCursor === -1) activeCursor = activeCells.length - 1;

  // Update UI
  clearAllClasses(['highlighted', 'active']);
  activeCells.forEach(cell => setCellClass(cell.row, cell.col, 'highlighted'));
  setCellClass(
    activeCells[activeCursor].row,
    activeCells[activeCursor].col,
    'active'
  );

  // Update state
  setState({
    activeWordId: activeWord.id,
    activeCells,
    activeCursor
  });

  return activeWord.clue;
}

export function inputLetter(letter) {
  const state = getState();
  const { activeCells, activeCursor, userGrid } = state;
  
  if (activeCursor >= activeCells.length) return;

  const cell = activeCells[activeCursor];
  const key = `${cell.row},${cell.col}`;

  // Update user grid
  userGrid[key] = letter;
  setCellLetter(cell.row, cell.col, letter);

  // Advance cursor
  let newCursor = activeCursor + 1;
  while (newCursor < activeCells.length && 
         userGrid[`${activeCells[newCursor].row},${activeCells[newCursor].col}`]) {
    newCursor++;
  }

  if (newCursor >= activeCells.length) newCursor = activeCells.length - 1;

  // Update UI
  setCellClass(cell.row, cell.col, 'highlighted');
  setCellClass(
    activeCells[newCursor].row,
    activeCells[newCursor].col,
    'active'
  );

  setState({
    activeCursor: newCursor,
    userGrid: { ...userGrid }
  });
}

export function backspace() {
  const state = getState();
  const { activeCells, activeCursor, userGrid } = state;
  
  let cell = activeCells[activeCursor];
  let key = `${cell.row},${cell.col}`;

  // If current cell is empty, move cursor back
  if (!userGrid[key] && activeCursor > 0) {
    cell = activeCells[activeCursor - 1];
    key = `${cell.row},${cell.col}`;
  }

  // Delete letter
  delete userGrid[key];
  setCellLetter(cell.row, cell.col, '');

  // Update cursor
  let newCursor = activeCells.findIndex(cell => 
    !userGrid[`${cell.row},${cell.col}`]
  );
  if (newCursor === -1) newCursor = activeCells.length - 1;

  // Update UI
  setCellClass(cell.row, cell.col, 'highlighted');
  setCellClass(
    activeCells[newCursor].row,
    activeCells[newCursor].col,
    'active'
  );

  setState({
    activeCursor: newCursor,
    userGrid: { ...userGrid }
  });
}

export function getHint() {
  const state = getState();
  const { activeWordId, activeCells, userGrid, words } = state;
  
  if (!activeWordId) return;

  const activeWord = words.find(w => w.id === activeWordId);
  if (!activeWord) return;

  // Find first empty cell
  const emptyCell = activeCells.find(cell => 
    !userGrid[`${cell.row},${cell.col}`]
  );
  if (!emptyCell) return;

  // Get correct letter
  const index = activeCells.indexOf(emptyCell);
  const letter = activeWord.word[index];

  // Update user grid
  userGrid[`${emptyCell.row},${emptyCell.col}`] = letter;
  setCellLetter(emptyCell.row, emptyCell.col, letter);

  // Advance cursor
  let newCursor = index + 1;
  while (newCursor < activeCells.length && 
         userGrid[`${activeCells[newCursor].row},${activeCells[newCursor].col}`]) {
    newCursor++;
  }

  if (newCursor >= activeCells.length) newCursor = activeCells.length - 1;

  // Update UI
  setCellClass(emptyCell.row, emptyCell.col, 'highlighted');
  setCellClass(
    activeCells[newCursor].row,
    activeCells[newCursor].col,
    'active'
  );

  setState({
    activeCursor: newCursor,
    userGrid: { ...userGrid }
  });
}
```