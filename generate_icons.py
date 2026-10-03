import os
from PIL import Image, ImageDraw

SRC_PATH = r"D:\Applications\Accordeur\GuitarCapoTuner.png"

def make_square(img):
    """Crops the image to a square from center with padding so it isn't zoomed/cropped."""
    w, h = img.size
    max_dim = max(w, h)
    
    # 15% padding margin around the graphic
    canvas_size = int(max_dim * 1.18)
    
    # Create new RGBA square canvas
    new_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    # Paste centered
    offset_x = (canvas_size - w) // 2
    offset_y = (canvas_size - h) // 2
    new_img.paste(img, (offset_x, offset_y))
    return new_img

def make_round(img):
    """Applies a circular mask to make a round icon."""
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    output = img.copy()
    output.putalpha(mask)
    return output

def main():
    if not os.path.exists(SRC_PATH):
        print(f"Error: {SRC_PATH} not found!")
        return

    print(f"Loading {SRC_PATH}...")
    src_img = Image.open(SRC_PATH).convert("RGBA")
    sq_img = make_square(src_img)
    round_img = make_round(sq_img)

    # 1. WebApp Icons
    print("Generating WebApp icons...")
    sq_img.resize((512, 512), Image.Resampling.LANCZOS).save(r"D:\Applications\Accordeur\webapp\favicon.png", "PNG")
    sq_img.resize((128, 128), Image.Resampling.LANCZOS).save(r"D:\Applications\Accordeur\webapp\icon.png", "PNG")
    
    # Save .ico (containing 16x16, 32x32, 48x48, 256x256)
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    sq_img.save(r"D:\Applications\Accordeur\webapp\favicon.ico", format="ICO", sizes=ico_sizes)

    # 2. Desktop Icons
    print("Generating Desktop icons...")
    os.makedirs(r"D:\Applications\Accordeur\desktop", exist_ok=True)
    sq_img.resize((512, 512), Image.Resampling.LANCZOS).save(r"D:\Applications\Accordeur\desktop\icon.png", "PNG")
    sq_img.save(r"D:\Applications\Accordeur\desktop\icon.ico", format="ICO", sizes=ico_sizes)

    # 3. Android Mipmap Icons
    print("Generating Android mipmap icons...")
    android_res_base = r"D:\Applications\Accordeur\APK\app\src\main\res"
    mipmaps = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    for folder, size in mipmaps.items():
        folder_path = os.path.join(android_res_base, folder)
        os.makedirs(folder_path, exist_ok=True)

        resized_sq = sq_img.resize((size, size), Image.Resampling.LANCZOS)
        resized_rd = round_img.resize((size, size), Image.Resampling.LANCZOS)

        # Save WEBP (Android standard in this project)
        resized_sq.save(os.path.join(folder_path, "ic_launcher.webp"), "WEBP")
        resized_rd.save(os.path.join(folder_path, "ic_launcher_round.webp"), "WEBP")
        
        # Remove any lingering .png files to prevent Duplicate Resource error
        png1 = os.path.join(folder_path, "ic_launcher.png")
        png2 = os.path.join(folder_path, "ic_launcher_round.png")
        if os.path.exists(png1): os.remove(png1)
        if os.path.exists(png2): os.remove(png2)

    print("[SUCCESS] All icons generated successfully!")

if __name__ == "__main__":
    main()
