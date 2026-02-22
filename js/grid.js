```javascript
export function renderGrid(containerId, words, onCellClick) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (!words || words.length === 0) return;

  // Calculate grid dimensions
  let maxRow = 0;
  let maxCol = 0;

  words.forEach(word => {
    if (word.dir === 'across') {
      maxRow = Math.max(maxRow, word.row);
      maxCol = Math.max(maxCol, word.col + word.word.length - 1);
    } else {
      maxRow = Math.max(maxRow, word.row + word.word.length - 1);
      maxCol = Math.max(maxCol, word.col);
    }
  });

  const rows = maxRow + 1;
  const cols = maxCol + 1;

  // Create grid matrix
  const grid = Array(rows).fill().map(() => Array(cols).fill(null));
  const wordStarts = {};

  // Sort words by row then col for numbering
  const sortedWords = [...words].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  // Assign numbers and mark cells
  sortedWords.forEach((word, index) => {
    wordStarts[`${word.row},${word.col}`] = index + 1;

    for (let i = 0; i < word.word.length; i++) {
      const r = word.dir === 'across' ? word.row : word.row + i;
      const c = word.dir === 'across' ? word.col + i : word.col;

      if (!grid[r][c]) {
        grid[r][c] = [];
      }
      grid[r][c].push(word.id);
    }
  });

  // Set grid template
  container.style.gridTemplateColumns = `repeat(${cols}, 36px)`;

  // Create cells
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (!grid[row][col]) {
        cell.classList.add('black');
      } else {
        cell.addEventListener('click', () => onCellClick(row, col));
        
        // Add number if this is a word start
        const startNumber = wordStarts[`${row},${col}`];
        if (startNumber) {
          const numberSpan = document.createElement('span');
          numberSpan.className = 'cell-number';
          numberSpan.textContent = startNumber;
          cell.appendChild(numberSpan);
        }
      }

      container.appendChild(cell);
    }
  }
}

export function highlightWord(cells, className) {
  clearHighlights();
  cells.forEach(({row, col}) => {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      cell.classList.add(className);
    }
  });
}

export function clearHighlights() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('highlighted', 'active', 'correct', 'wrong');
  });
}

export function setCellLetter(row, col, letter) {
  const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  if (cell && !cell.classList.contains('black')) {
    cell.textContent = letter || '';
  }
}

export function setCellClass(row, col, className, exclusive = false) {
  const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  if (cell) {
    if (exclusive) {
      cell.className = 'cell';
      if (cell.querySelector('.cell-number')) {
        cell.classList.add('has-number');
      }
    }
    cell.classList.add(className);
  }
}

export function clearAllClasses(classNames) {
  document.querySelectorAll('.cell').forEach(cell => {
    classNames.forEach(className => {
      cell.classList.remove(className);
    });
  });
}
```