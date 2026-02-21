```javascript
export function renderKeyboard(container, onKey) {
    const keyboardRows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
    ];

    const keyboard = document.createElement('div');
    keyboard.className = 'keyboard';

    keyboardRows.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';

        row.forEach(key => {
            const keyButton = document.createElement('button');
            keyButton.className = 'keyboard-key';
            keyButton.textContent = key;
            keyButton.addEventListener('click', () => handleKeyPress(key));
            rowDiv.appendChild(keyButton);
        });

        keyboard.appendChild(rowDiv);
    });

    container.appendChild(keyboard);

    function handleKeyPress(key) {
        if (key === 'BACKSPACE') {
            onKey('Backspace');
        } else {
            onKey(key.toUpperCase());
        }
    }

    function handlePhysicalKeyPress(event) {
        const key = event.key.toUpperCase();
        if (/^[A-Z]$/.test(key)) {
            onKey(key);
        } else if (event.key === 'Backspace') {
            onKey('Backspace');
        }
    }

    document.addEventListener('keydown', handlePhysicalKeyPress);

    return {
        destroy: () => {
            document.removeEventListener('keydown', handlePhysicalKeyPress);
            container.removeChild(keyboard);
        }
    };
}

export function destroyKeyboard(keyboard) {
    if (keyboard && keyboard.destroy) {
        keyboard.destroy();
    }
}
```