# Thumbnail & Preview Generation — Setup Guide

The derivative generation pipeline produces WebP thumbnails (64px, 256px) and document previews (1024px) for uploaded files. It relies on one npm package and up to three system binaries depending on the file type.

---

## Environment Variables

Add to your `.env` file as needed.

| Variable | Default | Description |
|----------|---------|-------------|
| `SOFFICE_BIN` | _(auto-detected)_ | Absolute path to the LibreOffice `soffice` binary. Auto-detects the macOS app bundle or falls back to `soffice` on `PATH`. Set explicitly on Linux servers. |

Example `.env` entries:

```env
# Derivative generation
# SOFFICE_BIN=/usr/bin/soffice
# SOFFICE_BIN=/Applications/LibreOffice.app/Contents/MacOS/soffice
```

No other env vars are required for thumbnail generation itself. The pipeline uses whatever storage backend is already configured.

---

## npm Package

Already declared in `package.json` — no separate install needed.

| Package | Version | Purpose |
|---------|---------|---------|
| `sharp` | `^0.34.5` | Resize source images and encode to WebP |

`sharp` bundles its own native libvips binaries, so no additional system library is needed for image processing on its own.

---

## System Binaries

These are **not** included in npm and must be installed on the host OS. Only install what you need based on the file types you want to support.

### 1. ffmpeg — Video thumbnails

Extracts a single frame from video files (MP4, AVI, MKV, MOV, WebM, OGG, etc.).

**macOS**
```bash
brew install ffmpeg
```

**Ubuntu / Debian**
```bash
sudo apt-get install ffmpeg
```

**RHEL / Amazon Linux**
```bash
sudo dnf install ffmpeg
```

**Verify**
```bash
ffmpeg -version
```

---

### 2. pdftoppm — PDF thumbnails

Part of the **Poppler** suite. Renders the first page of a PDF to PNG, which is then passed to sharp. Also used downstream after LibreOffice converts an Office document to PDF.

**macOS**
```bash
brew install poppler
```

**Ubuntu / Debian**
```bash
sudo apt-get install poppler-utils
```

**RHEL / Amazon Linux**
```bash
sudo dnf install poppler-utils
```

**Verify**
```bash
pdftoppm -v
```

---

### 3. LibreOffice — Office document thumbnails

Converts Office formats to PDF headlessly before `pdftoppm` renders the first page.

Supported formats: `.docx`, `.xlsx`, `.pptx`, `.doc`, `.xls`, `.ppt`, `.odt`, `.ods`, `.odp`, `.rtf`, `.epub`, `.hwp`

**macOS**

Download from [libreoffice.org](https://www.libreoffice.org/download/download/) and install to `/Applications`. The binary is then at `/Applications/LibreOffice.app/Contents/MacOS/soffice` and is auto-detected. Set `SOFFICE_BIN` only if you install elsewhere.

**Ubuntu / Debian**
```bash
sudo apt-get install libreoffice
```

After install, set in `.env`:
```env
SOFFICE_BIN=/usr/bin/soffice
```

**RHEL / Amazon Linux**
```bash
sudo dnf install libreoffice
```

**Verify**
```bash
soffice --version
```

---

### 4. Ghostscript — PostScript thumbnails

Renders `.ps` (PostScript) files to PNG.

**macOS**
```bash
brew install ghostscript
```

**Ubuntu / Debian**
```bash
sudo apt-get install ghostscript
```

**RHEL / Amazon Linux**
```bash
sudo dnf install ghostscript
```

**Verify**
```bash
gs --version
```

---

## File Type → Tool Mapping

| File type | Example formats | Tools required |
|-----------|----------------|----------------|
| Image | JPEG, PNG, GIF, WebP, BMP, SVG, AVIF | `sharp` only |
| Video | MP4, MKV, MOV, AVI, WebM | `ffmpeg` + `sharp` |
| PDF | `.pdf` | `pdftoppm` + `sharp` |
| PostScript | `.ps` | `gs` + `sharp` |
| Office docs | `.docx`, `.xlsx`, `.pptx`, `.doc`, `.xls`, `.ppt`, `.odt`, `.ods`, `.odp`, `.rtf`, `.epub`, `.hwp` | `soffice` + `pdftoppm` + `sharp` |

---

## Quick Install

**Ubuntu / Debian server (all types)**
```bash
sudo apt-get update
sudo apt-get install -y ffmpeg poppler-utils libreoffice ghostscript
npm install
```

**macOS dev machine (all types)**
```bash
brew install ffmpeg poppler ghostscript
# Download and install LibreOffice from libreoffice.org
npm install
```

---

## Output Specs

| Kind | Size | Format | Generated for |
|------|------|--------|--------------|
| `thumbnail` | 64px | WebP (quality 80) | All supported types |
| `thumbnail` | 256px | WebP (quality 80) | All supported types |
| `preview` | 1024px | WebP (quality 80) | Office documents only |

All sizes are maximum bounds; aspect ratio is preserved (`fit: inside`, no upscaling).
