```javascript
export function buildGrid(words) {
  let maxRow = 0;
  let maxCol = 0;

  words.forEach(word => {
    if (word.dir === 'across') {
      maxRow = Math.max(maxRow, word.row);
      maxCol = Math.max(maxCol, word.col + word.word.length);
    } else {
      maxRow = Math.max(maxRow, word.row + word.word.length);
      maxCol = Math.max(maxCol, word.col);
    }
  });

  const grid = Array.from({ length: maxRow }, () => 
    Array.from({ length: maxCol }, () => ({ type: 'black' }))
  );

  words.forEach(word => {
    const { row, col, word: text, dir, id } = word;
    for (let i = 0; i < text.length; i++) {
      const cellRow = dir === 'across' ? row : row + i;
      const cellCol = dir === 'across' ? col + i : col;
      grid[cellRow][cellCol] = {
        type: 'white',
        letter: '',
        number: i === 0 ? id : null,
        wordId: id,
        direction: dir
      };
    }
  });

  return grid;
}

export function renderGrid(grid, container) {
  container.innerHTML = '';
  grid.forEach((row, rowIndex) => {
    const rowElement = document.createElement('div');
    rowElement.className = 'grid-row';
    row.forEach((cell, colIndex) => {
      const cellElement = document.createElement('div');
      cellElement.className = `cell ${cell.type}`;
      cellElement.dataset.row = rowIndex;
      cellElement.dataset.col = colIndex;

      if (cell.type === 'white') {
        if (cell.number) {
          const numberElement = document.createElement('span');
          numberElement.className = 'cell-number';
          numberElement.textContent = cell.number;
          cellElement.appendChild(numberElement);
        }

        const letterElement = document.createElement('span');
        letterElement.className = 'cell-letter';
        letterElement.textContent = cell.letter;
        cellElement.appendChild(letterElement);
      }

      rowElement.appendChild(cellElement);
    });
    container.appendChild(rowElement);
  });
}
```