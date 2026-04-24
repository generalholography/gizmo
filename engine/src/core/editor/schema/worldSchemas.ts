import type { FieldMetadata } from './FieldMetadata';

export interface WorldSchemaGroup {
  name: string;
  label: string;
  collapsed?: boolean;
}

export interface WorldSchema {
  name: string;
  displayName: string;
  description?: string;
  fields: Record<string, FieldMetadata>;
  groups?: WorldSchemaGroup[];
}

class WorldSchemaRegistry {
  private schemas = new Map<string, WorldSchema>();
  private listeners = new Set<() => void>();

  register(schema: WorldSchema): void {
    this.schemas.set(schema.name, schema);
    this.notify();
  }

  get(name: string): WorldSchema | undefined {
    return this.schemas.get(name);
  }

  list(): WorldSchema[] {
    return Array.from(this.schemas.values());
  }

  clear(): void {
    this.schemas.clear();
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const worldSchemaRegistry = new WorldSchemaRegistry();

export const WorldMetadataSchema: WorldSchema = {
  name: 'metadata',
  displayName: 'World Metadata',
  description: 'Title, description, tags, and brand colors for the world',
  groups: [
    { name: 'general', label: 'General' },
    { name: 'branding', label: 'Branding' },
  ],
  fields: {
    title: {
      name: 'title',
      type: 'string',
      required: false,
      label: 'Title',
      description: 'Name of the world shown in menus and sharing',
      group: 'general',
    },
    description: {
      name: 'description',
      type: 'string',
      required: false,
      label: 'Description',
      description: 'Optional description of the world',
      group: 'general',
    },
    tags: {
      name: 'tags',
      type: 'array',
      required: false,
      label: 'Tags',
      description: 'Keywords for searching and filtering',
      defaultValue: [],
      group: 'branding',
      itemType: {
        name: 'tag',
        type: 'string',
        required: false,
        label: 'Tag',
      },
    },
    brandColors: {
      name: 'brandColors',
      type: 'array',
      required: false,
      label: 'Brand Colors',
      description: 'Primary colors used for UI accents',
      defaultValue: [],
      group: 'branding',
      itemType: {
        name: 'color',
        type: 'color',
        required: false,
        label: 'Color',
      },
    },
  },
};

export const WorldDimensionsSchema: WorldSchema = {
  name: 'dimensions',
  displayName: 'Dimensions',
  description: 'Gravity, day/night cycle, and sky settings for each dimension',
  groups: [
    { name: 'environment', label: 'Environment' },
  ],
  fields: {
    dimensions: {
      name: 'dimensions',
      type: 'array',
      required: true,
      label: 'Dimensions',
      description: 'Physical and visual settings per dimension',
      itemType: {
        name: 'dimension',
        type: 'object',
        required: true,
        label: 'Dimension',
        fields: {
          name: {
            name: 'name',
            type: 'string',
            required: true,
            label: 'Name',
          },
          gravity: {
            name: 'gravity',
            type: 'number',
            required: true,
            label: 'Gravity',
            description: 'Downward acceleration (negative pulls down)',
            group: 'environment',
            min: -100,
            max: 100,
            step: 0.5,
            defaultValue: -9.81,
          },
          useDayNightCycle: {
            name: 'useDayNightCycle',
            type: 'boolean',
            required: false,
            label: 'Use Day/Night Cycle',
            defaultValue: false,
            group: 'environment',
          },
          sky: {
            name: 'sky',
            type: 'object',
            required: false,
            label: 'Sky',
            description: 'Sky color, sun, clouds, and stars',
            sectionStyle: 'inspector',
            fields: {
              color: {
                name: 'color',
                type: 'color',
                required: false,
                label: 'Sky Color',
              },
              sun: {
                name: 'sun',
                type: 'object',
                required: false,
                label: 'Sun',
                fields: {
                  color: {
                    name: 'color',
                    type: 'color',
                    required: false,
                    label: 'Sun Color',
                  },
                  intensity: {
                    name: 'intensity',
                    type: 'number',
                    required: false,
                    label: 'Intensity',
                    min: 0,
                    max: 10,
                    step: 0.1,
                    defaultValue: 1,
                  },
                  timeOfDay: {
                    name: 'timeOfDay',
                    type: 'number',
                    required: false,
                    label: 'Time of Day',
                    description: '0-2399 (military time)',
                    min: 0,
                    max: 2399,
                    step: 1,
                    defaultValue: 1200,
                  },
                },
              },
              clouds: {
                name: 'clouds',
                type: 'object',
                required: false,
                label: 'Clouds',
                fields: {
                  color: {
                    name: 'color',
                    type: 'color',
                    required: false,
                    label: 'Cloud Color',
                  },
                  coverage: {
                    name: 'coverage',
                    type: 'number',
                    required: false,
                    label: 'Coverage',
                    min: 0,
                    max: 1,
                    step: 0.05,
                    defaultValue: 0.5,
                  },
                },
              },
              stars: {
                name: 'stars',
                type: 'object',
                required: false,
                label: 'Stars',
                fields: {
                  intensity: {
                    name: 'intensity',
                    type: 'number',
                    required: false,
                    label: 'Intensity',
                    min: 0,
                    max: 1,
                    step: 0.05,
                    defaultValue: 0,
                  },
                },
              },
            },
          },
          terrain: {
            name: 'terrain',
            type: 'object',
            required: false,
            label: 'Terrain',
            description: 'Height sampling defaults for spawners',
            sectionStyle: 'inspector',
            fields: {
              heightField: {
                name: 'heightField',
                type: 'string',
                required: false,
                label: 'Height Field',
              },
              size: {
                name: 'size',
                type: 'number',
                required: false,
                label: 'Size',
                min: 1,
                step: 1,
                defaultValue: 100,
              },
              heightOffset: {
                name: 'heightOffset',
                type: 'number',
                required: false,
                label: 'Height Offset',
                step: 0.1,
                defaultValue: 0,
              },
            },
          },
        },
      },
    },
  },
};

export const WorldRuntimeSchema: WorldSchema = {
  name: 'runtime',
  displayName: 'Runtime',
  description: 'Live world state values that can be edited',
  fields: {
    timeOfDay: {
      name: 'timeOfDay',
      type: 'number',
      required: false,
      label: 'Time of Day',
      description: '0-2399 (military time)',
      min: 0,
      max: 2399,
      step: 1,
      defaultValue: 1200,
    },
  },
};
