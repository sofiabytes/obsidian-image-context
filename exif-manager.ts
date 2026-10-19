/**
 * EXIF Data Manager
 * Manages different types of EXIF metadata from images
 */
import ExifReader from "exifreader";

export interface ExifData {
  [key: string]: unknown;
}

export interface FrontmatterRecord {
  [key: string]: unknown;
}

/**
 * Base class for EXIF managers
 */
export class ExifManager {
  protected file: File;
  protected exifData: Record<string, any>;

  constructor(file: File) {
    this.file = file
    this.exifData = {};
  }

  /**
   * Set a single EXIF value
   */
  set(key: string, value: unknown): void {
    this.exifData[key] = value;
  }

  /**
   * Get a single EXIF value
   */
  get(key: string): unknown | null {
    return this.exifData[key]?.value[0] ?? null;
  }

  /**
   * Get all EXIF values as an object
   */
  async getAll(): Promise<void> {
    const arrayBuffer = await this.file.arrayBuffer();
    const tags = await ExifReader.load(arrayBuffer);
    this.exifData = tags;
    console.log("this.exifdata: ", this.exifData)
  }



  /**
   * Clear all EXIF data
   */
  clear(): void {
    Object.keys(this.exifData).forEach(key => {
      delete this.exifData[key];
    });
  }

  /**
   * Check if EXIF data exists
   */
  hasData(): boolean {
    return Object.keys(this.exifData).length > 0;
  }
    async toFrontmatter(): Promise<FrontmatterRecord> {
    await this.getAll();
    const frontmatter: FrontmatterRecord = {
      source: this.file,
    };
    return frontmatter;
  }
}

/**
 * Manages date-related EXIF data
 */
export class DateExifManager extends ExifManager {
  async toFrontmatter(): Promise<FrontmatterRecord> {
    await this.getAll();
    const frontmatter: FrontmatterRecord = {
      source: this.file,
    };
    console.log("this.date: ", this.get('DateTimeOriginal'))
    // Map EXIF data to Obsidian frontmatter keys
    frontmatter.date = this.get('DateTimeOriginal') as string;
    frontmatter['date created'] = this.get('DateTimeOriginal') as string;
    frontmatter['date modified'] = this.get('ModifyDate') as string;
    frontmatter.created = this.get('CreateDate') as string;
    frontmatter.modified = this.get('ModifyDate') as string;
    frontmatter['year'] = this.get('Year') as string | number;
    frontmatter['month'] = this.get('Month') as string | number;
    frontmatter['day'] = this.get('Day') as string | number;

    return frontmatter;
  }
  	// 	// EXIF dates are commonly:
		// // YYYY:MM:DD HH:mm:ss
		// const normalizedDate = this.exifDate.replace(
		// 	/^(\d{4}):(\d{2}):(\d{2})/,
		// 	"$1-$2-$3"
		// );

		// const dateObj = new Date(
		// 	normalizedDate.replace(" ", "T")
		// );
}

/**
 * Manages location-related EXIF data
 */
export class LocationExifManager extends ExifManager {
  async toFrontmatter(): Promise<FrontmatterRecord> {
    await this.getAll();
    const frontmatter: FrontmatterRecord = {
      source: this.file,
    };

    // Map EXIF data to Obsidian frontmatter keys
    frontmatter['latitude'] = this.get('GPSLatitude') as string | number;
    frontmatter['longitude'] = this.get('GPSLongitude') as string | number;
    frontmatter['gps latitude'] = this.get('GPSLatitude') as string | number;
    frontmatter['gps longitude'] = this.get('GPSLongitude') as string | number;
    frontmatter['gps'] = this.get('GPSInfo') as string;
    frontmatter['location name'] = this.get('GPSLatitudeRef') as string;
    frontmatter['longitude direction'] = this.get('GPSLongitudeRef') as string;
    frontmatter['latitude direction'] = this.get('GPSLatitudeRef') as string;

    return frontmatter;
  }
}

/**
 * Manages caption-related EXIF data
 */
export class CaptionExifManager extends ExifManager {
  async toFrontmatter(): Promise<FrontmatterRecord> {
    await this.getAll();
    const frontmatter: FrontmatterRecord = {
      source: this.file,
    };

    // Map EXIF data to Obsidian frontmatter keys
    frontmatter.caption = this.get('ImageDescription') as string;
    frontmatter.alt = this.get('ImageDescription') as string;
    frontmatter['image description'] = this.get('ImageDescription') as string;
    frontmatter.title = this.get('ImageTitle') as string;
    frontmatter['image title'] = this.get('ImageTitle') as string;
    frontmatter.tags = this.get('ImageTitle') as string;
    frontmatter['keyword'] = this.get('ImageTitle') as string;
    frontmatter.keywords = this.get('ImageTitle') as string;

    return frontmatter;
  }
}

/**
 * Manages camera-related EXIF data
 */
export class CameraExifManager extends ExifManager {
  async toFrontmatter(): Promise<FrontmatterRecord> {
    await this.getAll();
    const frontmatter: FrontmatterRecord = {
      source: this.file,
    };

    // Map EXIF data to Obsidian frontmatter keys
    frontmatter['width'] = this.get('ImageWidth') as number;
    frontmatter['height'] = this.get('ImageHeight') as number;
    frontmatter['focal length'] = this.get('FocalLength') as string | number;
    frontmatter['iso'] = this.get('ISOSpeedRatings') as string | number;
    frontmatter['aperture'] = this.get('FNumber') as string | number;
    frontmatter['shutter speed'] = this.get('ExposureTime') as string | number;
    frontmatter['camera make'] = this.get('Make') as string;
    frontmatter['camera model'] = this.get('Model') as string;
    frontmatter['exposure program'] = this.get('ExposureProgram') as string;
    frontmatter['white balance'] = this.get('WhiteBalance') as string;
    frontmatter['flash'] = this.get('Flash') as string;
    frontmatter['metering mode'] = this.get('MeteringMode') as string;

    return frontmatter;
  }
}

/**
 * Manages image details EXIF data
 */
export class ImageDetailsExifManager extends ExifManager {
  async toFrontmatter(): Promise<FrontmatterRecord> {
    await this.getAll();
    const frontmatter: FrontmatterRecord = {
      source: this.file,
    };

    // Map EXIF data to Obsidian frontmatter keys
    frontmatter['color depth'] = this.get('ColorDepth') as string | number;
    frontmatter['bits per sample'] = this.get('BitsPerSample') as string | number;
    frontmatter['resolution'] = this.get('ResolutionUnit') as string | number;
    frontmatter['compression'] = this.get('Compression') as string;
    frontmatter['file size'] = this.get('FileSize') as string | number;
    frontmatter['dpi'] = this.get('ResolutionUnit') as string | number;
    frontmatter['orientation'] = this.get('Orientation') as string | number;
    frontmatter['software'] = this.get('Software') as string;
    frontmatter['artist'] = this.get('Artist') as string;
    frontmatter['copyright'] = this.get('Copyright') as string;
    frontmatter['color space'] = this.get('ColorSpace') as string;
    frontmatter['pixel x dimension'] = this.get('PixelXDimension') as string | number;
    frontmatter['pixel y dimension'] = this.get('PixelYDimension') as string | number;

    return frontmatter;
  }
}
