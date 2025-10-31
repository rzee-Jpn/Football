import os
import csv
import json
from collections import defaultdict

# ===== KONFIGURASI =====
INPUT_DIR = "https://raw.githubusercontent.com/rzee-Jpn/football-datasets/refs/heads/main/datalake/transfermarkt/player_profiles/player_profiles.csv"  # folder tempat semua CSV/TXT
OUTPUT_DIR = "data_output"
DEFAULT_SEASON = "2024/2025"

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ===== FUNGSI BANTUAN =====
def safe_int(val):
    try:
        return int(float(val))
    except:
        return None


def safe_float(val):
    try:
        return float(val)
    except:
        return None


def read_csv_or_txt(filepath):
    """Baca CSV atau TXT dengan autodetect delimiter"""
    with open(filepath, "r", encoding="utf-8") as f:
        sample = f.read(2048)
        delimiter = "," if sample.count(",") > sample.count("\t") else "\t"
        f.seek(0)
        reader = csv.DictReader(f, delimiter=delimiter)
        return list(reader)


def create_player_template(row, league_name):
    """Bentuk struktur data dasar per pemain"""
    return {
        "1_identitas_informasi_pribadi": {
            "nama_lengkap": row.get("player_name"),
            "nama_panggilan": row.get("known_as") or row.get("short_name"),
            "tanggal_lahir": row.get("date_of_birth"),
            "usia": safe_int(row.get("age")),
            "tempat_lahir": row.get("place_of_birth"),
            "kewarganegaraan": [row.get("citizenship")] if row.get("citizenship") else [],
            "tinggi_badan_cm": safe_int(row.get("height_in_cm")),
            "berat_badan_kg": safe_int(row.get("weight_in_kg")),
            "posisi_utama": row.get("position_main"),
            "posisi_alternatif": [row.get("position_other")] if row.get("position_other") else [],
            "kaki_dominan": row.get("foot"),
            "status_pemain": row.get("player_status"),
            "klub_saat_ini": row.get("current_club_name"),
            "nomor_punggung": safe_int(row.get("shirt_number")),
            "tanggal_bergabung": row.get("joined_date"),
            "durasi_kontrak": {
                "mulai": row.get("contract_start_date"),
                "berakhir": row.get("contract_expiry_date")
            },
            "agen": row.get("player_agent"),
            "media_sosial": {
                "instagram": row.get("instagram_link"),
                "twitter": row.get("twitter_link")
            }
        },
        "2_nilai_pasar": {
            "nilai_terkini_euro": safe_int(row.get("market_value_in_eur")),
            "tanggal_update": row.get("last_market_value_update"),
            "riwayat_nilai_pasar": [],
            "nilai_tertinggi_karier": safe_int(row.get("highest_market_value_in_eur"))
        },
        "3_data_klub_kontrak": {
            "klub_saat_ini": row.get("current_club_name"),
            "liga": league_name,
            "kontrak": {
                "mulai": row.get("contract_start_date"),
                "berakhir": row.get("contract_expiry_date")
            },
            "status": "Aktif" if row.get("player_status") == "Active" else row.get("player_status"),
            "klausul_rilis": None,
            "gaji_tahunan_euro": None
        },
        "4_riwayat_transfer": [],
        "5_data_cedera": [],
        "6_statistik_performa": {},
        "7_karier_internasional": {
            "negara": row.get("citizenship"),
            "level": [],
            "debut_internasional": None,
            "turnamen_besar": []
        },
        "8_prestasi_penghargaan": {
            "gelar_tim": [],
            "penghargaan_individu": [],
            "jumlah_trofi_total": None
        },
        "9_statistik_taktikal": {
            "formasi_favorit": None,
            "posisi_utama": row.get("position_main"),
            "kontribusi_dalam_formasi": None
        },
        "10_tren_karier": {
            "timeline_klub": [],
            "perpindahan_posisi": [],
            "tren_nilai_pasar": None,
            "tren_performa": None
        }
    }


# ===== UTAMA =====
for filename in os.listdir(INPUT_DIR):
    if not (filename.endswith(".csv") or filename.endswith(".txt")):
        continue

    file_path = os.path.join(INPUT_DIR, filename)
    rows = read_csv_or_txt(file_path)

    if not rows:
        print(f"⚠️ File kosong: {filename}")
        continue

    league_name = (
        rows[0].get("league_name")
        or filename.replace(".csv", "").replace(".txt", "").replace("_", " ").title()
    )

    league_id = league_name.lower().replace(" ", "_")
    output_path = os.path.join(OUTPUT_DIR, f"{league_id}.json")

    # Load JSON lama kalau ada
    if os.path.exists(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            try:
                league_json = json.load(f)
            except json.JSONDecodeError:
                league_json = {"league": league_name, "season": DEFAULT_SEASON, "players": {}}
    else:
        league_json = {"league": league_name, "season": DEFAULT_SEASON, "players": {}}

    # Proses tiap pemain
    for row in rows:
        player_name = row.get("player_name", "").strip().replace(" ", "_").lower()
        if not player_name:
            continue

        player_data = create_player_template(row, league_name)

        # Merge jika sudah ada pemainnya (update saja bagian yang ada)
        if player_name in league_json["players"]:
            old = league_json["players"][player_name]
            for k, v in player_data.items():
                if v and not old.get(k):
                    old[k] = v
            league_json["players"][player_name] = old
        else:
            league_json["players"][player_name] = player_data

    # Simpan hasil
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(league_json, f, ensure_ascii=False, indent=2)

    print(f"✅ {league_name} → {len(league_json['players'])} pemain tersimpan di {output_path}")

print("🚀 Semua liga selesai diproses!")
