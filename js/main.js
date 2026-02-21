```javascript
import { DEFAULT_DATA } from './data.js';
import { buildGrid } from './grid.js';
import { renderKeyboard } from './keyboard.js';
import { Game } from './game.js';

document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('crossword-grid');
    const keyboardContainer = document.getElementById('keyboard');
    const clueBanner = document.getElementById('clue-banner');
    const progress = document.getElementById('progress');
    const jsonTextarea = document.getElementById('json-textarea');
    const loadButton = document.getElementById('load-button');
    const checkButton = document.getElementById('check-button');
    const hintButton = document.getElementById('hint-button');
    const resetButton = document.getElementById('reset-button');
    const overlay = document.getElementById('overlay');
    const overlayMessage = document.getElementById('overlay-message');

    const onWin = (time) => {
        overlayMessage.textContent = `🎉 Selamat! Waktu penyelesaian: ${time} detik`;
        overlay.style.display = 'flex';
    };

    let game = new Game(DEFAULT_DATA, onWin);

    const renderGame = () => {
        gridContainer.innerHTML = '';
        gridContainer.appendChild(buildGrid(game.words));
        progress.textContent = `${game.solvedWords.size}/${game.words.length} kata`;
    };

    const handleKeyPress = (key) => {
        if (key === 'BACKSPACE') {
            game.handleBackspace();
        } else {
            game.handleInput(key);
        }
        renderGame();
    };

    renderKeyboard(keyboardContainer, handleKeyPress);
    renderGame();

    loadButton.addEventListener('click', () => {
        try {
            const newData = JSON.parse(jsonTextarea.value);
            game = new Game(newData, onWin);
            renderGame();
        } catch (error) {
            alert('JSON tidak valid');
        }
    });

    checkButton.addEventListener('click', () => {
        game.checkAnswers();
        renderGame();
    });

    hintButton.addEventListener('click', () => {
        game.getHint();
        renderGame();
    });

    resetButton.addEventListener('click', () => {
        game.reset();
        renderGame();
    });

    overlay.addEventListener('click', () => {
        overlay.style.display = 'none';
    });
});
```