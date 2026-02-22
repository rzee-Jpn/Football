```javascript
let _state = null;

export function createState(words) {
  return {
    words,
    totalWords: words.length,
    userGrid: {},
    activeWordId: null,
    activeCells: [],
    activeCursor: 0,
    solvedWords: new Set(),
    startTime: null,
    timerInterval: null
  };
}

export function getState() {
  return _state;
}

export function setState(partial) {
  Object.assign(_state, partial);
}

export function initState(words) {
  _state = createState(words);
  _state.startTime = Date.now();
}
```