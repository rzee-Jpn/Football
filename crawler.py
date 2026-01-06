import requests, json, os, time
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE = "https://www.gutenberg.org"
BOOKSHELF_START = "https://www.gutenberg.org/ebooks/bookshelf/696"
LIMIT_PER_RUN = 3

TXT_DIR = "books/txt"
HTML_DIR = "books/html"

os.makedirs(TXT_DIR, exist_ok=True)
os.makedirs(HTML_DIR, exist_ok=True)

HEADERS = {"User-Agent": "Gutenberg-Economics-Crawler/1.0"}

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

def save_txt(book_id, text):
    path = f"{TXT_DIR}/{book_id}.txt"
    if os.path.exists(path):
        return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return True

def txt_to_html(book_id, text):
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{book_id} | Project Gutenberg Economics</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{{max-width:800px;margin:auto;font-family:serif;line-height:1.6;padding:20px}}
pre{{white-space:pre-wrap}}
footer{{margin-top:40px;font-size:0.9em;color:#555}}
</style>
</head>
<body>
<h1>Gutenberg Economics Book #{book_id}</h1>
<pre>{text}</pre>
<footer>
<p>Source: Project Gutenberg — Public Domain</p>
</footer>
</body>
</html>"""
    with open(f"{HTML_DIR}/{book_id}.html", "w", encoding="utf-8") as f:
        f.write(html)

def generate_index():
    books = sorted(os.listdir(HTML_DIR))
    items = "\n".join(
        f'<li><a href="books/html/{b}">{b.replace(".html","")}</a></li>'
        for b in books
    )
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Economics Books – Project Gutenberg</title>
</head>
<body>
<h1>Public Domain Economics Books</h1>
<ul>{items}</ul>
<p>Source: Project Gutenberg (Public Domain)</p>
</body>
</html>"""
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)

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