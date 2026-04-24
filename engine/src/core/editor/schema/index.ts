/**
 * Component Schema System
 * Exports all schema-related types and utilities
 */

// Core types
export * from './FieldMetadata';
export * from './ComponentSchemaRegistry';

// Module schemas (reusable)
export * from './ModuleSchemas';

// Component schemas
export { TransformSchema } from './schemas/TransformSchema';
export { BodySchema } from './schemas/BodySchema';
export { MotionSourceSchema } from './schemas/MotionSourceSchema';
export { HealthSchema } from './schemas/HealthSchema';
export { InfoSchema } from './schemas/InfoSchema';
export { AISchema } from './schemas/AISchema';
export { AnimationSchema } from './schemas/AnimationSchema';
export { InventorySchema } from './schemas/InventorySchema';
export {
  FactionSchema,
  PlayerSchema,
  StableIDSchema,
  VelocitySchema,
  HeldSchema,
  OwnerSchema,
  MountingSchema,
  MountedBySchema,
  StaticCameraSchema,
  DamageFlashSchema,
  SpawnedAtSchema,
} from './schemas/GameplaySchemas';

// World schemas
export {
  worldSchemaRegistry,
  WorldDimensionsSchema,
  WorldMetadataSchema,
  WorldRuntimeSchema,
} from './worldSchemas';

// Re-export registry instance for convenience
export { componentSchemaRegistry } from './ComponentSchemaRegistry';
