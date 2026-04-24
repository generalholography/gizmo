/**
 * Editor Test World
 * Comprehensive demonstration of Phase 3 editor features
 * 
 * Features demonstrated:
 * - Body Editor: Various geometry types (box, sphere, cylinder, capsule)
 * - World Settings: Metadata, gravity, sky configuration
 * - Archetype Browser: Multiple archetypes for spawning
 * - Transform editing and manipulation
 * - Inspector component viewing
 */

export default {
  setupScene(api) {
    const { spawn, initialize, registerArchetype } = api;

    // ===== WORLD INITIALIZATION =====
    initialize({
      title: "Editor Test World",
      description: "Comprehensive test environment for Phase 3 editor features including Body Editor, World Settings, and Archetype Browser",
      tags: ["test", "editor", "phase3"],
      
      dimensions: [{
        name: "base",
        gravity: -20,
        useDayNightCycle: false,
        sky: {
          color: "#87CEEB",
          sun: {
            color: "#ffffff",
            intensity: 1.0,
            timeOfDay: 1200
          }
        }
      }],

      modules: {
        condition: [{
          name: "metric_at_least",
          definition: {
            type: "compare",
            params: {
              operator: "gte",
              left: { type: "metric", params: { metric: "editor_actions" } },
              right: { type: "parameter", params: { name: "minimum", defaultValue: 0 } }
            }
          }
        }]
      },

      achievements: [
        {
          name: "editor_explorer",
          description: "Explore all editor features",
          condition: {
            type: "reference",
            params: {
              name: "metric_at_least",
              args: { minimum: { type: "literal", params: { value: 0 } } }
            }
          }
        }
      ]
    });

    // ===== REGISTER ARCHETYPES =====
    
    // Simple Box Archetype
    registerArchetype("test_box", {
      Info: { name: "Test Box", description: "Simple box for testing" },
      Transform: { x: 0, y: 1, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "box",
              params: { lengthX: 1, lengthY: 1, lengthZ: 1 }
            },
            material: {
              type: "solid",
              params: { color: "#FF6B6B" }
            }
          }]
        }
      },
      MotionSource: { type: "dynamicRigidBody", params: { mass: 1 } }
    });

    // Sphere Archetype
    registerArchetype("test_sphere", {
      Info: { name: "Test Sphere", description: "Rolling sphere" },
      Transform: { x: 0, y: 1, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "sphere",
              params: { radius: 0.5 }
            },
            material: {
              type: "solid",
              params: { color: "#4ECDC4" }
            }
          }]
        }
      },
      MotionSource: { type: "dynamicRigidBody", params: { mass: 0.5 } }
    });

    // Cylinder Archetype
    registerArchetype("test_cylinder", {
      Info: { name: "Test Cylinder", description: "Cylindrical object" },
      Transform: { x: 0, y: 1, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "cylinder",
              params: { radius: 0.5, height: 2 }
            },
            material: {
              type: "solid",
              params: { color: "#95E1D3" }
            }
          }]
        }
      },
      MotionSource: { type: "dynamicRigidBody", params: { mass: 1.5 } }
    });

    // Capsule Archetype
    registerArchetype("test_capsule", {
      Info: { name: "Test Capsule", description: "Capsule shape" },
      Transform: { x: 0, y: 1, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "capsule",
              params: { radius: 0.4, height: 1.5 }
            },
            material: {
              type: "solid",
              params: { color: "#F38181" }
            }
          }]
        }
      },
      MotionSource: { type: "dynamicRigidBody", params: { mass: 1.2 } }
    });

    // Composite Archetype (multiple parts)
    registerArchetype("test_composite", {
      Info: { name: "Test Composite", description: "Multiple parts combined" },
      Transform: { x: 0, y: 2, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [
            {
              geometry: {
                type: "box",
                params: { lengthX: 1, lengthY: 0.3, lengthZ: 1 }
              },
              material: {
                type: "solid",
                params: { color: "#AA96DA" }
              }
            },
            {
              localPosition: { x: 0, y: 0.5, z: 0 },
              geometry: {
                type: "cylinder",
                params: { radius: 0.3, height: 0.8 }
              },
              material: {
                type: "solid",
                params: { color: "#FCBAD3" }
              }
            }
          ]
        }
      },
      MotionSource: { type: "static", params: {} }
    });

    // ===== SPAWN INITIAL ENTITIES =====

    // Ground plane (large static box)
    spawn({
      Info: { name: "Ground", description: "Test ground plane" },
      Transform: { x: 0, y: -0.5, z: 0, sx: 20, sz: 20 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "box",
              params: { lengthX: 20, lengthY: 1, lengthZ: 20 }
            },
            material: {
              type: "solid",
              params: { color: "#A8E6A3", roughness: 1.0 }
            }
          }]
        }
      },
      MotionSource: { type: "static", params: {} }
    });

    // Box entity - editable via Body Editor
    spawn({
      Info: { name: "Editable Box", description: "Try editing this box's geometry!" },
      Transform: { x: -3, y: 1, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "box",
              params: { lengthX: 1, lengthY: 1, lengthZ: 1 }
            },
            material: {
              type: "solid",
              params: { color: "#FF6B6B", roughness: 0.5 }
            }
          }]
        }
      },
      MotionSource: { type: "dynamicRigidBody", params: { mass: 1 } }
    });

    // Sphere entity - editable via Body Editor
    spawn({
      Info: { name: "Editable Sphere", description: "Try changing the radius!" },
      Transform: { x: -1, y: 1, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "sphere",
              params: { radius: 0.5 }
            },
            material: {
              type: "solid",
              params: { color: "#4ECDC4", roughness: 0.3 }
            }
          }]
        }
      },
      MotionSource: { type: "dynamicRigidBody", params: { mass: 0.8 } }
    });

    // Cylinder entity - editable via Body Editor
    spawn({
      Info: { name: "Editable Cylinder", description: "Adjust radius and height" },
      Transform: { x: 1, y: 1.5, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "cylinder",
              params: { radius: 0.4, height: 2 }
            },
            material: {
              type: "solid",
              params: { color: "#95E1D3", metalness: 0.5 }
            }
          }]
        }
      },
      MotionSource: { type: "dynamicRigidBody", params: { mass: 1.5 } }
    });

    // Capsule entity - editable via Body Editor
    spawn({
      Info: { name: "Editable Capsule", description: "Perfect for character controllers" },
      Transform: { x: 3, y: 1.5, z: 0 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "capsule",
              params: { radius: 0.4, height: 1.5 }
            },
            material: {
              type: "solid",
              params: { color: "#F38181", roughness: 0.4 }
            }
          }]
        }
      },
      MotionSource: { type: "dynamicRigidBody", params: { mass: 1.2 } }
    });

    // Static platform (back row)
    spawn({
      Info: { name: "Platform 1", description: "Static platform for testing" },
      Transform: { x: -4, y: 0.5, z: -3 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "box",
              params: { lengthX: 2, lengthY: 0.3, lengthZ: 2 }
            },
            material: {
              type: "solid",
              params: { color: "#FFD93D" }
            }
          }]
        }
      },
      MotionSource: { type: "static", params: {} }
    });

    spawn({
      Info: { name: "Platform 2", description: "Another static platform" },
      Transform: { x: 0, y: 0.5, z: -3 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "box",
              params: { lengthX: 2, lengthY: 0.3, lengthZ: 2 }
            },
            material: {
              type: "solid",
              params: { color: "#6BCB77" }
            }
          }]
        }
      },
      MotionSource: { type: "static", params: {} }
    });

    spawn({
      Info: { name: "Platform 3", description: "Third static platform" },
      Transform: { x: 4, y: 0.5, z: -3 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "box",
              params: { lengthX: 2, lengthY: 0.3, lengthZ: 2 }
            },
            material: {
              type: "solid",
              params: { color: "#4D96FF" }
            }
          }]
        }
      },
      MotionSource: { type: "static", params: {} }
    });

    // Action graph authoring sample for Stores/Rules editor validation
    spawn({
      Info: { name: "Action Graph Beacon", description: "Demonstrates sequence + if action control flow in Rules." },
      Transform: { x: 0, y: 1, z: 4 },
      Body: {
        type: "composite",
        params: {
          parts: [{
            geometry: {
              type: "box",
              params: { lengthX: 1.2, lengthY: 1.2, lengthZ: 1.2 }
            },
            material: {
              type: "solid",
              params: { color: "#7C3AED", roughness: 0.35 }
            }
          }]
        }
      },
      MotionSource: { type: "static", params: {} },
      Rules: [{
        trigger: { type: "interact" },
        actions: {
          type: "sequence",
          params: {
            actions: [
              {
                type: "emitEvent",
                target: "self",
                params: { name: "editor_action_graph_interact" }
              },
              {
                type: "if",
                params: {
                  condition: {
                    type: "compare",
                    params: {
                      operator: "eq",
                      left: { type: "literal", params: { value: 1 } },
                      right: { type: "literal", params: { value: 1 } }
                    }
                  },
                  then: {
                    type: "popup",
                    target: "other",
                    params: { text: "Action graph branch: then" }
                  },
                  else: {
                    type: "popup",
                    target: "other",
                    params: { text: "Action graph branch: else" }
                  }
                }
              }
            ]
          }
        }
      }]
    });

    console.log("[Editor Test World] Loaded successfully!");
    console.log("Try the following:");
    console.log("- Select entities and edit their bodies using the Body Editor");
    console.log("- Open World Settings (gear icon) to modify gravity and sky");
    console.log("- Open Archetype Browser (grid icon) to spawn new entities");
    console.log("- Use Transform Editor to move, rotate, and scale entities");
    console.log("- Test undo/redo with Ctrl+Z / Ctrl+Shift+Z");
  }
};
