/**
 * World Settings Command
 * Modify world metadata and dimensions
 */

import { ECSContext, setResource, getResource } from '../../ecs';
import { EditorCommand } from '../CommandManager';
import { WorldMetadata } from '../../schema';

export class ModifyWorldSettingsCommand implements EditorCommand {
  description: string;

  constructor(
    private ctx: ECSContext,
    private oldSettings: Partial<WorldMetadata>,
    private newSettings: Partial<WorldMetadata>
  ) {
    this.description = 'Modify World Settings';
  }

  execute(): void {
    this.applySettings(this.newSettings);
  }

  undo(): void {
    this.applySettings(this.oldSettings);
  }

  redo(): void {
    this.execute();
  }

  private applySettings(settings: Partial<WorldMetadata>): void {
    // Update metadata resource
    const currentMetadata = getResource<WorldMetadata>(this.ctx, 'metadata', true) || {};
    const updatedMetadata = { ...currentMetadata, ...settings };
    setResource(this.ctx, 'metadata', updatedMetadata);

    // Apply gravity if dimensions changed
    if (settings.dimensions && settings.dimensions.length > 0 && this.ctx.rapier?.world) {
      const gravity = settings.dimensions[0].gravity ?? -20;
      const gravityVec = { x: 0, y: gravity, z: 0 };
      this.ctx.rapier.world.gravity = gravityVec;
    }

    // Note: Sky color changes require shader uniform updates
    // This would need to be handled by the rendering system
    // For now, the change is stored and will take effect on next reload

    console.log('[WorldSettings] Applied settings:', settings);
  }
}
