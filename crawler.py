import requests, json, os, time, re
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# =====================
# CONFIG
# =====================
BASE = "https://www.gutenberg.org"
BOOKSHELF_START = "https://www.gutenberg.org/ebooks/bookshelf/696"
LIMIT_PER_RUN = 3

TXT_DIR = "books/txt"
HTML_DIR = "books/html"

os.makedirs(TXT_DIR, exist_ok=True)
os.makedirs(HTML_DIR, exist_ok=True)

HEADERS = {"User-Agent": "Gutenberg-Economics-Crawler/1.0"}

CHAPTER_REGEX = re.compile(
    r'^(CHAPTER|BOOK|PART)\s+([IVXLCDM]+|\d+)\b.*',
    re.IGNORECASE | re.MULTILINE
)

# =====================
# STATE
# =====================
def load_state():
    if not os.path.exists("state.json"):
        return {
            "current_page": BOOKSHELF_START,
            "page_index": 0,
            "finished": False
        }
    with open("state.json") as f:
        return json.load(f)

def save_state(state):
    with open("state.json", "w") as f:
        json.dump(state, f, indent=2)

# =====================
# GUTENBERG HELPERS
# =====================
def get_bookshelf_page(url):
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")

    books = []
    for a in soup.select("li.booklink a.link"):
        href = a.get("href")
        if href and href.startswith("/ebooks/"):
            books.append(urljoin(BASE, href))

    next_link = None
    for a in soup.select("a"):
        if a.text.strip().lower() == "next":
            next_link = urljoin(BASE, a["href"])

    return books, next_link

def get_utf8_link(book_page):
    r = requests.get(book_page, headers=HEADERS, timeout=15)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")

    for a in soup.select("a"):
        href = a.get("href", "")
        if href.endswith(".txt.utf-8"):
            return urljoin(BASE, href)
    return None

def clean_gutenberg_text(text):
    start = text.find("*** START OF THIS PROJECT GUTENBERG EBOOK")
    end = text.find("*** END OF THIS PROJECT GUTENBERG EBOOK")
    if start != -1 and end != -1:
        return text[start:end]
    return text

# =====================
# METADATA
# =====================
def extract_metadata(text):
    title = "Unknown Title"
    author = ""

    for line in text.splitlines()[:60]:
        if line.lower().startswith("title:"):
            title = line.split(":", 1)[1].strip()
        elif line.lower().startswith("author:"):
            author = line.split(":", 1)[1].strip()

    return title, author

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip("-") or "untitled"

# =====================
# TOC
# =====================
def extract_toc(text):
    toc = []
    for m in CHAPTER_REGEX.finditer(text):
        title = m.group(0).strip()
        anchor = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        toc.append((title, anchor))
    return toc

def inject_anchors(text, toc):
    for title, anchor in toc:
        text = text.replace(
            title,
            f'<h2 id="{anchor}">{title}</h2>',
            1
        )
    return text

def render_sidebar(toc):
    if not toc:
        return ""
    items = "\n".join(
        f'<li><a href="#{a}">{t}</a></li>'
        for t, a in toc
    )
    return f"""
<aside id="toc">
<h3>Daftar Isi</h3>
<ul>{items}</ul>
</aside>
"""

# =====================
# SAVE FILES
# =====================
def save_txt(book_id, text):
    path = f"{TXT_DIR}/{book_id}.txt"
    if os.path.exists(path):
        return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return True

def txt_to_html(book_id, text):
    title, author = extract_metadata(text)
    slug = slugify(title)

    toc = extract_toc(text)
    content = inject_anchors(text, toc)
    sidebar = render_sidebar(toc)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body {{
  margin: 0;
  display: flex;
  font-family: serif;
}}
#toc {{
  width: 260px;
  padding: 20px;
  border-right: 1px solid #ddd;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}}
#content {{
  max-width: 900px;
  padding: 40px;
}}
h2 {{ margin-top: 2em; }}
pre {{ white-space: pre-wrap; }}
@media (max-width: 900px) {{
  #toc {{ display: none; }}
  body {{ flex-direction: column; }}
}}
</style>
</head>
<body>

{sidebar}

<main id="content">
<h1>{title}</h1>
<p><em>{author}</em></p>
<pre>{content}</pre>
<footer>
<p>Source: Project Gutenberg — Public Domain</p>
</footer>
</main>

</body>
</html>
"""

    filename = f"{slug}.html"
    path = f"{HTML_DIR}/{filename}"

    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)

    return filename, title

# =====================
# INDEX
# =====================
def generate_index():
    items = []

    for file in sorted(os.listdir(HTML_DIR)):
        path = f"{HTML_DIR}/{file}"
        with open(path, encoding="utf-8") as f:
            html = f.read()

        m = re.search(r"<h1>(.*?)</h1>", html)
        title = m.group(1) if m else file.replace(".html", "")

        items.append(f'<li><a href="books/html/{file}">{title}</a></li>')

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Economics Books — Public Domain</title>
</head>
<body>
<h1>Public Domain Economics Books</h1>
<ul>
{''.join(items)}
</ul>
<p>Source: Project Gutenberg</p>
</body>
</html>"""

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)

# =====================
# MAIN
# =====================
def main():
    state = load_state()
    if state.get("finished"):
        return

    books, next_page = get_bookshelf_page(state["current_page"])
    count = 0

    for book_url in books[state["page_index"]:]:
        book_id = book_url.split("/")[-1]
        txt_link = get_utf8_link(book_url)
        if not txt_link:
            state["page_index"] += 1
            continue

        r = requests.get(txt_link, headers=HEADERS, timeout=20)
        text = clean_gutenberg_text(r.text)

        if save_txt(book_id, text):
            txt_to_html(book_id, text)
            count += 1

        state["page_index"] += 1
        time.sleep(2)

        if count >= LIMIT_PER_RUN:
            break

    if state["page_index"] >= len(books):
        if next_page:
            state["current_page"] = next_page
            state["page_index"] = 0
        else:
            state["finished"] = True

    generate_index()
    save_state(state)

if __name__ == "__main__":
    main()