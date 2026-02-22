```javascript
import { DEFAULT_DATA } from './data.js';
import { renderGrid, clearAllClasses } from './grid.js';
import { initKeyboard } from './keyboard.js';
import { CrosswordGame } from './game.js';

document.addEventListener('DOMContentLoaded', () => {
  const data = DEFAULT_DATA;

  const handleCellClick = (row, col) => {
    const clue = game.selectCell(row, col);
    document.getElementById('clue-banner').textContent = clue;
  };

  const handleKey = (key) => {
    if (key === 'BACKSPACE') {
      game.backspace();
    } else {
      game.inputLetter(key);
    }
  };

  const onProgress = ({ correct, total }) => {
    document.getElementById('progress-text').textContent = `${correct}/${total} kata`;
  };

  const onWin = (elapsedMs) => {
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const winOverlay = document.getElementById('win-overlay');
    winOverlay.textContent = `🎉 Selamat! Waktu: ${timeString}`;
    winOverlay.style.display = 'block';
  };

  const wireButtons = () => {
    document.getElementById('cek-btn').addEventListener('click', () => {
      game.checkAnswers();
    });

    document.getElementById('petunjuk-btn').addEventListener('click', () => {
      game.getHint();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      game.reset();
      clearAllClasses(['correct', 'wrong', 'active', 'highlighted']);
    });

    document.getElementById('muat-btn').addEventListener('click', () => {
      const jsonTextarea = document.getElementById('json-textarea');
      const jsonError = document.getElementById('json-error');
      try {
        const newData = JSON.parse(jsonTextarea.value);
        game.loadNewData(newData);
        jsonError.textContent = '';
      } catch (error) {
        jsonError.textContent = 'JSON tidak valid';
      }
    });
  };

  renderGrid('grid-container', data.words, handleCellClick);
  const game = new CrosswordGame(data.words, { onProgress, onWin });
  initKeyboard('keyboard-container', handleKey);
  wireButtons();
});
```