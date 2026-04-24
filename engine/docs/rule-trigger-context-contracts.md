# Rule Trigger Context Contracts

This document defines the runtime context guarantees for Rules trigger execution.

## Context keys
- `self`: entity that owns the rule being executed.
- `other`: counterpart entity for pair/action triggers.
- `user`: controlling/initiating actor (player/user context).

## Trigger contracts

| Trigger | `self` | `other` | `user` | Meaning |
| --- | --- | --- | --- | --- |
| `immediate` | guaranteed | unavailable | unavailable | Runs once at registration. |
| `event` | guaranteed | optional | optional | From global event payload (`target`/`other`, `actor`/`user`). |
| `interact` | guaranteed | guaranteed | guaranteed | Interactable (`self`) used by interactor (`other`/`user`). |
| `collisionEnter` | guaranteed | guaranteed | unavailable | Collision pair. |
| `entityInRange` | guaranteed | guaranteed | unavailable | Sensor/range pair. |
| `timeElapsed` | guaranteed | unavailable | unavailable | Time-elapsed engine trigger. |
| `die` | guaranteed | guaranteed | unavailable | Dead entity (`self`) and killer/source (`other`). |
| `primaryAction` | guaranteed | guaranteed | guaranteed | Acting entity/item (`self`), aim/fallback target (`other`), controller (`user`). |
| `secondaryAction` | guaranteed | guaranteed | guaranteed | Same as primary action for secondary input. |
| `time` | guaranteed | unavailable | unavailable | Delayed timer. |
| `interval` | guaranteed | unavailable | unavailable | Periodic timer. |
| `proximity` | guaranteed | unavailable | unavailable | Spatial rule trigger. |

## Enforcement
- Runtime assertions skip effects that request unavailable context targets and emit trace reason codes.
- Editor validation blocks rules that request targets unavailable for their trigger contract.
- Effect target resolution is centralized in one resolver table shared by rule and action effect pathways.
