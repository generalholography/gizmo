import { ECSContext, getResource } from "../ecs";
import { getRuleModule } from "../../modules/rule";

export const updateTimeElapsedEffects = (ctx: ECSContext): void => {
  const dt = getResource<number>(ctx, "deltaTime") || 1 / 60;
  const ruleModule = getRuleModule(ctx);
  ruleModule.update(dt);
};
