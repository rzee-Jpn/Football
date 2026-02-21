Game Name: My TTS
Genre: Word Puzzle
Orientation: Portrait
Platform: Mobile Web

## Game Engine
Phaser 3 + Vite

## Cara Kerja Grid
- Grid dibuat OTOMATIS berdasarkan data JSON
- Ukuran grid menyesuaikan total sel yang dibutuhkan semua kata
- Setiap kata punya koordinat (row, col) dan arah (across/down)
- Kotak hitam otomatis mengisi sel yang tidak dipakai kata manapun

## Data Soal (JSON — bisa diganti/ditambah)
json
{
  "title": "TTS Nusantara",
  "words": [
    { "id": 1, "word": "KUCING",   "clue": "Hewan peliharaan yang suka mengeong",        "row": 0, "col": 0, "dir": "across" },
    { "id": 2, "word": "KAPAL",    "clue": "Kendaraan yang berlayar di laut",             "row": 0, "col": 0, "dir": "down"   },
    { "id": 3, "word": "ULAR",     "clue": "Reptil panjang tidak berkaki",                "row": 0, "col": 3, "dir": "down"   },
    { "id": 4, "word": "RUMAH",    "clue": "Tempat berlindung dan tinggal manusia",       "row": 2, "col": 1, "dir": "across" },
    { "id": 5, "word": "ANGIN",    "clue": "Udara yang bergerak terasa sejuk",            "row": 2, "col": 4, "dir": "down"   },
    { "id": 6, "word": "HUJAN",    "clue": "Air yang turun dari langit",                  "row": 4, "col": 0, "dir": "across" },
    { "id": 7, "word": "NASI",     "clue": "Makanan pokok orang Indonesia",               "row": 4, "col": 2, "dir": "down"   },
    { "id": 8, "word": "IKAN",     "clue": "Hewan air bersirip dan bersisik",             "row": 6, "col": 1, "dir": "across" },
    { "id": 9, "word": "LANGIT",   "clue": "Hamparan biru di atas kepala kita",           "row": 6, "col": 3, "dir": "down"   },
    { "id": 10, "word": "POHON",   "clue": "Tumbuhan besar yang punya batang keras",      "row": 8, "col": 0, "dir": "across" }
  ]
}


## Mekanisme Gameplay
- Klik sel → pilih kata (kalau 2 arah berpotongan, klik lagi untuk toggle arah)
- Highlight seluruh sel kata yang aktif
- Ketik huruf dari keyboard (desktop) atau virtual keyboard (mobile)
- Backspace untuk hapus huruf
- Navigasi otomatis ke sel berikutnya setelah ketik huruf
- Tombol "Cek" → sel benar jadi hijau, salah jadi merah
- Tombol "Petunjuk" → reveal 1 huruf dari kata aktif
- Tombol "Reset" → kosongkan semua jawaban

## Fitur JSON Upgrade
- Ada textarea di bawah game untuk paste JSON baru
- Tombol "Muat Soal" untuk load JSON baru tanpa reload halaman
- Grid otomatis resize sesuai data baru
- Validasi JSON: tampilkan error jika format salah

## UI Layout (Portrait)
- Header: judul game + progress bar (X/total kata selesai)
- Grid di tengah, scroll jika terlalu besar
- Banner petunjuk aktif di bawah grid (tampilkan soal kata yang dipilih)
- Virtual keyboard QWERTY + Backspace di bawah
- Panel "Ganti Soal" collapsible di paling bawah

## Visual Style
- Background gelap (#0f0e0c)
- Sel kosong: abu gelap
- Sel aktif: highlight kuning/gold
- Sel benar: hijau
- Sel salah: merah muda
- Font grid: monospace bold
- Nomor kecil di pojok kiri atas tiap sel pertama kata

## Kondisi Menang
Semua kata benar → overlay "Selamat! 🎉" dengan animasi konfeti
Tampilkan total waktu penyelesaian

## Kondisi Teknis
- SEMUA grafis via Phaser Graphics API atau DOM (tidak ada file gambar)
- Virtual keyboard wajib muncul di mobile
- Touch support penuh
- Responsive untuk layar 360px - 768px
