
import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit(
        "缺少 Pillow 库，请先运行：\n"
        "    pip install pillow\n"
        "然后重新运行本脚本。"
    )


def main() -> None:
    # 项目根目录 = 本脚本所在目录的上一级
    root = Path(__file__).resolve().parents[1]
    dist_dir = root / "dist"
    src_png = dist_dir / "icon.png"

    if not src_png.is_file():
        raise SystemExit(f"未找到图标文件：{src_png}")

    build_dir = root / "build"
    build_dir.mkdir(parents=True, exist_ok=True)
    out_ico = build_dir / "icon.ico"

    img = Image.open(src_png).convert("RGBA")

    # 生成多尺寸 ICO（常见 Windows 尺寸）
    sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    icons = [img.resize(size, Image.LANCZOS) for size in sizes]

    icons[0].save(out_ico, format="ICO", sizes=sizes)
    print(f"已生成 ICO：{out_ico}")


if __name__ == "__main__":
    main()
