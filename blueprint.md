Game Name: TTS Nusantara
Genre: Word Puzzle - Crossword
Orientation: Portrait
Platform: Mobile Web

## Game Type
Teka-Teki Silang (Crossword Puzzle) bahasa Indonesia
Grid otomatis berdasarkan koordinat kata di JSON

## Word Data (JSON — hardcode ini di GameScene)
```json
{
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
}
```

## Grid System
- Hitung ukuran grid otomatis dari koordinat max semua kata
- Sel yang tidak dipakai kata manapun = kotak hitam
- Nomor kecil di pojok kiri atas sel pertama tiap kata

## Gameplay Mechanics
- Klik sel putih → pilih kata (highlight seluruh kata aktif berwarna kuning)
- Jika sel berpotongan 2 kata → klik lagi toggle arah across/down
- Ketik huruf → masuk ke sel aktif, kursor otomatis maju ke sel berikutnya
- Backspace → hapus huruf, kursor mundur
- Tombol CEK → validasi semua: benar=hijau, salah=merah
- Tombol PETUNJUK → reveal 1 huruf dari kata aktif
- Tombol RESET → kosongkan semua

## UI Layout (DOM-based, bukan Phaser canvas)
- Header: judul "TTS Nusantara" + progress "X/10 kata"
- Grid crossword di tengah (div-based, bukan canvas)
- Banner di bawah grid: tampilkan clue kata yang aktif
- Virtual keyboard QWERTY 3 baris + tombol BACKSPACE
- Tombol CEK, PETUNJUK, RESET
- Panel "Ganti Soal" collapsible: textarea JSON + tombol Muat

## JSON Upgrade Feature
- User bisa paste JSON baru di textarea
- Klik "Muat Soal" → grid rebuild otomatis dari JSON baru
- Validasi: tampilkan pesan error jika JSON tidak valid
- Format JSON sama seperti contoh di atas

## Visual Style
- Background: #1a1a2e (gelap biru)
- Sel kosong: #ffffff
- Sel aktif: #fff176 (kuning)
- Sel highlight (satu kata): #fffde7
- Sel benar: #a5d6a7 (hijau muda)
- Sel salah: #ef9a9a (merah muda)
- Kotak hitam: #212121
- Font sel: bold monospace, 18px
- Nomor: 9px, pojok kiri atas

## Win Condition
Semua kata terisi benar → overlay "🎉 Selamat!" dengan waktu penyelesaian

## Tech Stack
- PENTING: Ini bukan Phaser game — ini pure HTML/CSS/JS (vanilla)
- Tidak perlu Phaser sama sekali
- Satu file index.html dengan embedded CSS dan JS
- Tidak perlu src/main.js atau scenes
- Responsive untuk layar 360px-768px
