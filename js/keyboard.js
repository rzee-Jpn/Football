```javascript
export function initKeyboard(containerId, onKey) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

  rows.forEach((row, rowIndex) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'keyboard-row';

    row.split('').forEach(key => {
      const button = document.createElement('button');
      button.textContent = key;
      button.dataset.key = key;
      button.addEventListener('click', () => onKey(key));
      rowDiv.appendChild(button);
    });

    if (rowIndex === rows.length - 1) {
      const backspaceButton = document.createElement('button');
      backspaceButton.textContent = '⌫';
      backspaceButton.dataset.key = 'BACKSPACE';
      backspaceButton.addEventListener('click', () => onKey('BACKSPACE'));
      rowDiv.appendChild(backspaceButton);
    }

    container.appendChild(rowDiv);
  });

  const physicalHandler = (e) => {
    if (e.key.match(/^[a-zA-Z]$/)) {
      onKey(e.key.toUpperCase());
    }
    if (e.key === 'Backspace') {
      onKey('BACKSPACE');
    }
    e.preventDefault();
  };

  document.addEventListener('keydown', physicalHandler);
}

export function destroyKeyboard() {
  document.removeEventListener('keydown', physicalHandler);
}
```