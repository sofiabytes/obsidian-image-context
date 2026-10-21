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
    className: DateExifManager,
    enabled: true
  },
  {
    id: 'location',
    name: 'Location (GPS)',
    description: 'Extract GPS coordinates and location data',
    frontendKey: 'location',
    className: LocationExifManager,
    enabled: true
  },
  {
    id: 'captions',
    name: 'Captions & Tags',
    description: 'Extract image descriptions and tags',
    frontendKey: 'captions',
    className: CaptionExifManager,
    enabled: true
  },
  {
    id: 'camera',
    name: 'Camera Details',
    description: 'Extract camera settings (ISO, aperture, shutter speed, etc.)',
    frontendKey: 'camera',
    className: CameraExifManager,
    enabled: true
  },
  {
    id: 'image-details',
    name: 'Image Details',
    description: 'Extract image technical details (resolution, color depth, etc.)',
    frontendKey: 'image-details',
    className: ImageDetailsExifManager,
    enabled: true
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
 * Check if an EXIF manager is enabled
 */
export function isManagerEnabled(managerId: string, enabledKeys: string[]): boolean {
  return enabledKeys.includes(managerId);
}

/**
 * Get a specific EXIF manager config by ID
 */
export function getManagerConfigById(id: string): ExifManagerConfig | undefined {
  return EXIF_MANAGER_CONFIGS.find(config => config.id === id);
}

/**
 * Get the status (enabled/disabled) for each EXIF manager
 */
export function getManagerStatuses(enabledKeys: string[]): Record<string, boolean> {
  return EXIF_MANAGER_CONFIGS.reduce((acc, config) => {
    acc[config.id] = enabledKeys.includes(config.id);
    return acc;
  }, {} as Record<string, boolean>);
}
