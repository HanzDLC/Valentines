import json
from pathlib import Path
from typing import Optional

from flask import Flask, render_template

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
IMAGES_DIR = BASE_DIR / "static" / "images"
AUDIO_DIR = BASE_DIR / "static" / "audio"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a"}


def list_media(directory: Path, allowed_extensions: set[str]) -> list[Path]:
    if not directory.exists():
        return []

    files = [
        file
        for file in directory.iterdir()
        if file.is_file() and file.suffix.lower() in allowed_extensions
    ]
    return sorted(files, key=lambda file: file.name.lower())


def build_sequential_slides() -> list[dict]:
    slides_file = BASE_DIR / "slides.json"
    if not slides_file.exists():
        return [{
            "image": "",
            "title": "Setup Required",
            "caption": "Please run generate_manifest.py to create slides.json."
        }]
    
    try:
        with open(slides_file, "r", encoding="utf-8-sig") as f:
            return json.load(f)
    except Exception as e:
        return [{
            "image": "",
            "title": "Error",
            "caption": f"Failed to load slides: {e}"
        }]


def resolve_audio_path() -> Optional[str]:
    audio_files = list_media(AUDIO_DIR, AUDIO_EXTENSIONS)
    if not audio_files:
        return None

    return f"audio/{audio_files[0].name}"


@app.route("/")
def index():
    slides = build_sequential_slides()
    audio_file = resolve_audio_path()
    return render_template("index.html", slides=slides, audio_file=audio_file)


if __name__ == "__main__":
    app.run(debug=True)
