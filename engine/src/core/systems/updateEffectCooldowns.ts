import { hasComponent } from "bitecs";
import { ECSContext, getResource } from "../ecs";
import { Player } from "../components";
import { ReactiveMap } from "../../utils/reactiveTypes";
import { ArchetypeBundle } from "../despawn";
import { getStore, InventoryStore, Store } from "../../modules/entityStore";
import { getRuleModule } from "../../modules/rule";

export const updateEffectCooldownSystem = (ctx: ECSContext): void => {
  const dt = getResource<number>(ctx, 'deltaTime') || 1 / 60;
  updateInventoryItemCooldowns(ctx, dt);
};

function updateInventoryItemCooldowns(ctx: ECSContext, dt: number): void {
  const inventories = getStore<InventoryStore>(ctx, 'inventory');
  const heldItems = getStore<Store<{ eid: number; slot: number }>>(ctx, 'heldItems');
  const playerCooldownCallbacks = getResource<ReactiveMap<number>>(ctx, 'playerInventoryCooldownCallbacks');
  const ruleModule = getRuleModule(ctx);

  for (const [holderEid, inventory] of inventories.entries()) {
    const heldEntry = heldItems.get(holderEid);
    const heldSlot = heldEntry?.slot ?? -1;

    for (let slotIndex = 0; slotIndex < inventory.slots.length; slotIndex++) {
      let maxCooldownPct = -1;

      if (slotIndex === heldSlot && heldEntry) {
        const heldRulePct = ruleModule.getEntityMaxCooldownPercent(heldEntry.eid);
        if (typeof heldRulePct === 'number') {
          maxCooldownPct = Math.max(maxCooldownPct, heldRulePct);
        }
      } else {
        let definition: string | ArchetypeBundle;

        const item = inventory.slots[slotIndex];
        if (!item || item.type !== 'entity') {
          if (hasComponent(ctx, Player, holderEid)) {
            playerCooldownCallbacks.set(String(slotIndex), null);
          }
          continue;
        }

        definition = item.definition;
        if (typeof definition !== 'string') {
          const rules = Array.isArray((definition as any).Rules) ? (definition as any).Rules : [];
          for (const rule of rules) {
            const remaining = typeof rule?.__cooldownRemaining === 'number' ? rule.__cooldownRemaining : 0;
            const cooldown = typeof rule?.cooldown === 'number' ? rule.cooldown : 0;
            if (remaining > 0 && cooldown > 0) {
              rule.__cooldownRemaining = Math.max(0, remaining - dt);
              const pct = rule.__cooldownRemaining / cooldown;
              if (pct > maxCooldownPct) maxCooldownPct = pct;
            }
          }
        }
      }

      if (hasComponent(ctx, Player, holderEid)) {
        playerCooldownCallbacks.set(String(slotIndex), maxCooldownPct >= 0 ? Math.min(1, Math.max(0, maxCooldownPct)) : null);
      }
    }
  }
}
