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
    # 1. Gather all subdirectories as potential collections
    subdirs = [d for d in IMAGES_DIR.iterdir() if d.is_dir() and not d.name.startswith('.')]
    subdirs.sort(key=lambda d: d.name.lower()) # Alphabetical/Numbered order

    all_slides = []

    # Process subdirectories in order
    for subdir in subdirs:
        images = list_media(subdir, IMAGE_EXTENSIONS)
        if not images:
            continue
        
        # Read description.txt if it exists
        desc_file = subdir / "description.txt"
        folder_desc = desc_file.read_text(encoding='utf-8').strip() if desc_file.exists() else ""
        
        # Inject a transition slide for each folder
        all_slides.append({
            "is_transition": True,
            "source_folder": subdir.name,
            "folder_description": folder_desc,
            "image": None
        })

        for i, img in enumerate(images, 1):
            # Check for specific image description (e.g. image.txt for image.jpg)
            img_desc_file = subdir / f"{img.stem}.txt"
            img_caption = img_desc_file.read_text(encoding='utf-8').strip() if img_desc_file.exists() else ""

            all_slides.append({
                "source_folder": subdir.name,
                "folder_description": folder_desc,
                "image": f"images/{subdir.name}/{img.name}",
                "caption": img_caption
            })

    if not all_slides:
        return [{
            "image": "",
            "title": "No Photos Found",
            "caption": "Add folders with images to static/images."
        }]

    return all_slides


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
