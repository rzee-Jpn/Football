```javascript
export const DEFAULT_DATA = {
  "title": "TTS Nusantara",
  "words": [
    { "id": 1, "word": "KUCING",  "clue": "Hewan peliharaan yang suka mengeong",     "row": 0, "col": 0, "dir": "across" },
    { "id": 2, "word": "KAPAL",   "clue": "Kendaraan yang berlayar di laut",          "row": 0, "col": 0, "dir": "down"   },
    { "id": 3, "word": "ULAR",    "clue": "Reptil panjang tidak berkaki",             "row": 0, "col": 3, "dir": "down"   },
    { "id": 4, "word": "RUMAH",   "clue": "Tempat berlindung dan tinggal manusia",    "row": 2, "col": 1, "dir": "across" },
    { "id": 5, "word": "ANGIN",   "clue": "Udara yang bergerak terasa sejuk",         "row": 2, "col": 4, "dir": "down"   },
    { "id": 6, "word": "HUJAN",   "clue": "Air yang turun dari langit",               "row": 4, "col": 0, "dir": "across" },
    { "id": 7, "word": "NASI",    "clue": "Makanan pokok orang Indonesia",            "row": 4, "col": 2, "dir": "down"   },
    { "id": 8, "word": "IKAN",    "clue": "Hewan air bersirip dan bersisik",          "row": 6, "col": 1, "dir": "across" },
    { "id": 9, "word": "LANGIT",  "clue": "Hamparan biru di atas kepala kita",        "row": 6, "col": 3, "dir": "down"   },
    { "id": 10, "word": "POHON",  "clue": "Tumbuhan besar dengan batang keras",       "row": 8, "col": 0, "dir": "across" }
  ]
};

export function validateData(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  if (!data.title || typeof data.title !== 'string') {
    return false;
  }
  if (!Array.isArray(data.words) || data.words.length === 0) {
    return false;
  }
  for (const word of data.words) {
    if (!word.id || typeof word.id !== 'number') {
      return false;
    }
    if (!word.word || typeof word.word !== 'string') {
      return false;
    }
    if (!word.clue || typeof word.clue !== 'string') {
      return false;
    }
    if (typeof word.row !== 'number' || word.row < 0) {
      return false;
    }
    if (typeof word.col !== 'number' || word.col < 0) {
      return false;
    }
    if (!word.dir || (word.dir !== 'across' && word.dir !== 'down')) {
      return false;
    }
  }
  return true;
}
```