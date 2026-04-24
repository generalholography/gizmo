import type { ECSContext } from '../../ecs';
import type { EditorCommand } from '../CommandManager';
import {
  applyViewportCameraPose,
  getViewportCameraPose,
  type ViewportCameraPose,
  type ViewportCameraSetOptions,
} from '../../viewportCamera';

export class ViewportCameraCommand implements EditorCommand {
  description: string;

  private readonly previousPose: ViewportCameraPose;
  private readonly nextPose: ViewportCameraSetOptions;

  constructor(
    private readonly ctx: ECSContext,
    nextPose: ViewportCameraSetOptions,
    description = 'Move viewport camera',
  ) {
    this.description = description;
    this.previousPose = getViewportCameraPose(ctx);
    this.nextPose = nextPose;
  }

  execute(): void {
    applyViewportCameraPose(this.ctx, this.nextPose);
  }

  undo(): void {
    applyViewportCameraPose(this.ctx, this.previousPose);
  }

  redo(): void {
    this.execute();
  }
}
