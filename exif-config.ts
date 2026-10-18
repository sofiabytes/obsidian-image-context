/**
 * EXIF Manager Configuration
 * Defines all available EXIF manager classes and their frontmatter mappings
 */

export interface ExifManagerConfig {
  id: string;
  name: string;
  description: string;
  frontendKey: string;
}

export const EXIF_MANAGER_CONFIGS: ExifManagerConfig[] = [
  {
    id: 'date',
    name: 'Date & Time',
    description: 'Extract date and time metadata from images',
    frontendKey: 'date'
  },
  {
    id: 'location',
    name: 'Location (GPS)',
    description: 'Extract GPS coordinates and location data',
    frontendKey: 'location'
  },
  {
    id: 'captions',
    name: 'Captions & Tags',
    description: 'Extract image descriptions and tags',
    frontendKey: 'captions'
  },
  {
    id: 'camera',
    name: 'Camera Details',
    description: 'Extract camera settings (ISO, aperture, shutter speed, etc.)',
    frontendKey: 'camera'
  },
  {
    id: 'image-details',
    name: 'Image Details',
    description: 'Extract image technical details (resolution, color depth, etc.)',
    frontendKey: 'image-details'
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
