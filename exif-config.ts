/**
 * EXIF Manager Configuration
 * Defines all available EXIF manager classes and their frontmatter mappings
 */
import {ImageDetailsExifManager, CameraExifManager, ExifManager, CaptionExifManager, LocationExifManager, DateExifManager} from "./exif-manager"

export interface ExifManagerConfig {
  id: string;
  name: string;
  description: string;
  frontendKey: string;
  className: new (file: File) => ExifManager;
}

export const EXIF_MANAGER_CONFIGS: ExifManagerConfig[] = [
  {
    id: 'date',
    name: 'Date & Time',
    description: 'Extract date and time metadata from images',
    frontendKey: 'date',
    className: DateExifManager
  },
  {
    id: 'location',
    name: 'Location (GPS)',
    description: 'Extract GPS coordinates and location data',
    frontendKey: 'location',
    className: LocationExifManager
  },
  {
    id: 'captions',
    name: 'Captions & Tags',
    description: 'Extract image descriptions and tags',
    frontendKey: 'captions',
    className: CaptionExifManager
  },
  {
    id: 'camera',
    name: 'Camera Details',
    description: 'Extract camera settings (ISO, aperture, shutter speed, etc.)',
    frontendKey: 'camera',
    className: CameraExifManager
  },
  {
    id: 'image-details',
    name: 'Image Details',
    description: 'Extract image technical details (resolution, color depth, etc.)',
    frontendKey: 'image-details',
    className: ImageDetailsExifManager
  }
];

/**
 * Get enabled EXIF managers by their IDs
 * @param enabledKeys Array of enabled EXIF manager IDs
 */
export function getEnabledManagers(enabledKeys: string[]): ExifManagerConfig[] {
  return EXIF_MANAGER_CONFIGS.filter(config => enabledKeys.includes(config.id));
}

/**
 * Get all EXIF manager IDs
 */
export function getAllManagerIds(): string[] {
  return EXIF_MANAGER_CONFIGS.map(config => config.id);
}

/**
 * Get a specific EXIF manager config by ID
 */
export function getManagerConfigById(id: string): ExifManagerConfig | undefined {
  return EXIF_MANAGER_CONFIGS.find(config => config.id === id);
}
