# PixNote

PixNote is an Obsidian plugin for importing images with metadata pages auto-populated with tags, and EXIF data.

## Features

- **Import Images**: Select files from your computer and add them to your vault with associated metadata notes
- **EXIF Data Extraction**: Automatically extract date and location from image metadata when enabled
- **Custom Metadata**: Add tags, source URLs, and descriptions to each imported file
- **Organized Folders**: Configure separate folders for images and metadata notes
- **Frontmatter Notes**: Generated notes include YAML frontmatter with all metadata for easy querying

## Installation

1. Install via Community Plugins in Obsidian settings

## Usage

1. Enable the plugin in Obsidian settings
2. Run the **"Add image with metadata"** command
3. Select an image
4. Configure:
   - **Image folder**: Where to save the file
   - **Note folder**: Where to save the metadata note
   - **Tags**: Comma-separated tags (e.g., `reading, quote`)
   - **Source**: URL or reference for the image
   - **Description**: Additional notes about the file
   - **Extract EXIF**: Enable to include GPS coordinates and date
5. Click **"Create File"** to import

## Generated Notes

Each import creates:
1. An image/PDF file in the configured folder
2. A markdown note with:
   - Frontmatter containing tags, source, EXIF data
   - A wikilink to the image
   - Your description (if provided)

### Frontmatter Example

```yaml
---
tags: [reading, quote]
source: "https://example.com"
created: 2024-01-15T10:30:00.000Z
created-time: "2024:01:15 10:30:00"
latitude: 40.7128
longitude: -74.0060
location: "40.7128, -74.0060"
---
![[image.jpg]]

Your description here...
```

## Settings

Configure in Obsidian settings under the PixNote plugin tab:

- **Image Folder**: Default path where imported images/PDFs are saved
- **Metadata Note Folder**: Default path where associated markdown notes are saved
- **Extract EXIF Data**: Enable to automatically extract date and GPS from images


## License

MIT
