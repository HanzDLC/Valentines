import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
IMAGES_DIR = BASE_DIR / "static" / "images"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

def list_media(directory: Path, allowed_extensions: set[str]) -> list[Path]:
    if not directory.exists():
        return []
    files = [
        file
        for file in directory.iterdir()
        if file.is_file() and file.suffix.lower() in allowed_extensions
    ]
    return sorted(files, key=lambda file: file.name.lower())

def generate():
    slides = []
    
    if not IMAGES_DIR.exists():
        print("No images directory found.")
        return

    subdirs = [d for d in IMAGES_DIR.iterdir() if d.is_dir() and not d.name.startswith('.')]
    subdirs.sort(key=lambda d: d.name.lower())

    for subdir in subdirs:
        images = list_media(subdir, IMAGE_EXTENSIONS)
        if not images:
            continue
            
        # Description
        desc_file = subdir / "description.txt"
        folder_desc = desc_file.read_text(encoding='utf-8').strip() if desc_file.exists() else ""
        
        # Transition Slide
        slides.append({
            "is_transition": True,
            "source_folder": subdir.name,
            "folder_description": folder_desc,
            "image": None,
            "caption": ""
        })
        
        # Images
        for img in images:
            img_desc_file = subdir / f"{img.stem}.txt"
            img_caption = img_desc_file.read_text(encoding='utf-8').strip() if img_desc_file.exists() else ""
            
            slides.append({
                "source_folder": subdir.name,
                "folder_description": folder_desc,
                "image": f"images/{subdir.name}/{img.name}",
                "caption": img_caption,
                "is_transition": False
            })

    output_file = BASE_DIR / "slides.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(slides, f, indent=2)
    
    print(f"Generated {len(slides)} slides in {output_file}")

if __name__ == "__main__":
    generate()
