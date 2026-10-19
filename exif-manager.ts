/**
 * EXIF Data Manager
 * Manages different types of EXIF metadata from images
 */
import ExifReader from "exifreader";
  export const FLASH_DESCRIPTIONS: Record<number, string> = {
  0: 'Flash did not fire',
  1: 'Flash fired',
  5: 'Flash fired, return light not detected',
  7: 'Flash fired, return light detected',
  8: 'Flash did not fire, automatic mode',
  9: 'Flash fired, automatic mode',
  16: 'Flash did not fire, compulsory flash mode',
  24: 'Flash did not fire, automatic mode not supported by the flash',
  };
export interface ExifData {
  [key: string]: unknown;
}

export interface FrontmatterRecord {
  [key: string]: unknown;
}
type Fraction = [number, number];
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
    return this.exifData[key]?.value ?? null;
  }

  /**
   * Get all EXIF values as an object
   */
  async getAll(): Promise<void> {
    const arrayBuffer = await this.file.arrayBuffer();
    const tags = await ExifReader.load(arrayBuffer);
    this.exifData = tags;
  
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
      
    };
    console.log("this.date: ", this.get('DateTimeOriginal'))
    // Map EXIF data to Obsidian frontmatter keys
    frontmatter.date = this.get('DateTimeOriginal') as string;

    return frontmatter;
  }
}

/**
 * Manages location-related EXIF data
 */
export class LocationExifManager extends ExifManager {
  latlonToDecimal(value: Fraction[], direction: string): number {
    const degrees = value[0][0] / value[0][1];
    const minutes = value[1][0] / value[1][1];
    const seconds = value[2][0] / value[2][1];
    if (direction == 'N' || direction == 'E'){
      return degrees + minutes / 60 + seconds / 3600;
    } else{
      return -degrees - minutes / 60 - seconds / 3600;
    }
  }

  altitudeCalc(value: Fraction, direction: number){
    const meters = value[0] / value[1];

    switch (direction) {
      case 0:
        return meters;
      case 1:
        return -meters;
      default:
        throw new Error(`Invalid GPSAltitudeRef: ${direction}`);
    } 
}

  async toFrontmatter(): Promise<FrontmatterRecord> {
    await this.getAll();
    const frontmatter: FrontmatterRecord = {
      source: this.file,
    };

    const absLatitude=this.get('GPSLatitude') as Fraction[] | null;
    const absLongitude=this.get('GPSLongitude') as Fraction[] | null;
    const longDirection = this.get('GPSLongitudeRef') as string;
    const latDirection = this.get('GPSLatitudeRef') as string;
    if (absLatitude != null && absLongitude !=null){
      frontmatter['latitude'] = this.latlonToDecimal(absLatitude, latDirection)
      frontmatter['longitude'] = this.latlonToDecimal(absLongitude, longDirection)
      frontmatter['location'] = [frontmatter['latitude'], frontmatter['longitude']]
    }
    const AltitudeFraction=this.get('GPSAltitude') as Fraction | null;
    const AltitudeDirection=this.get('GPSAltitudeRef') as number | null;

    if (AltitudeFraction != null && AltitudeDirection !=null){
      frontmatter['altitude']=this.altitudeCalc(AltitudeFraction, AltitudeDirection)
    }
    

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
      
    };
    console.log("this.exifdata: ", this.exifData)
    const imageTitle = this.get('ImageTitle') as string[];
    frontmatter['title'] = imageTitle[0]
    const imageDescription = this.get('ImageDescription') as string[];
    frontmatter['description'] = imageDescription[0]
    const tagsList = this.get('TagsList') as string[];
    frontmatter['tag'] = '  - '+tagsList.join('\n  - ')

    return frontmatter;
  }
}

/**
 * Manages camera-related EXIF data
 */
export class CameraExifManager extends ExifManager {
  flashTranlator(flashCode : number):string{
    return FLASH_DESCRIPTIONS[flashCode] ?? `Unknown flash mode (${flashCode})`;
    return ''
  }

  async toFrontmatter(): Promise<FrontmatterRecord> {

    await this.getAll();
    const frontmatter: FrontmatterRecord = {
      
    };

    // Map EXIF data to Obsidian frontmatter keys
    frontmatter['focal length'] = this.get('FocalLength') as string | number;
    frontmatter['iso'] = this.get('ISOSpeedRatings') as string | number;
    frontmatter['aperture'] = this.get('FNumber') as string | number;
    frontmatter['shutter speed'] = this.get('ExposureTime') as string | number;
    frontmatter['camera make'] = this.get('Make') as string;
    frontmatter['camera model'] = this.get('Model') as string;
    frontmatter['exposure program'] = this.get('ExposureProgram') as string;
    frontmatter['white balance'] = this.get('WhiteBalance') as string;
    frontmatter['flash'] = this.flashTranlator(this.get('Flash') as number);

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
      
    };

    // Map EXIF data to Obsidian frontmatter keys
    frontmatter['artist'] = this.get('Artist') as string;
    frontmatter['copyright'] = this.get('Copyright') as string;

    return frontmatter;
  }
}
