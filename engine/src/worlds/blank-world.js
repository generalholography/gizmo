
// Auto-generated world script from saved world
const worldDefinition = {
  "title": "Blank World",
  "description": "An empty world ready for your own ideas.",
  "tags": [
    "blank",
    "starter"
  ],
  "brandColors": [
    "#87ceeb",
    "#fffacd"
  ],
  "dimensions": [
    {
      "name": "Blank",
      "gravity": -9.81,
      "useDayNightCycle": false,
      "sky": {
        "color": "#dfe7ef",
        "sun": {
          "color": "#ffffff",
          "intensity": 0.8,
          "timeOfDay": 1200
        },
        "clouds": {
          "color": "#ffffff",
          "coverage": 0
        },
        "stars": {
          "intensity": 0
        }
      },
      "chunks": [
        {
          "chunkId": "main",
          "bounds": null,
          "entities": [
            {
              "_meta": {
                "serializedAt": 1773867315786,
                "engineVersion": "0.3.0",
                "storesSchemaVersion": 1,
                "archetype": "dragon"
              },
              "AI": {
                "isAggressive": true,
                "awarenessRange": 80
              },
              "Animation": {
                "clips": [
                  {
                    "name": "default",
                    "duration": 2,
                    "tracks": [
                      {
                        "targetTag": "wing_left_root",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              -0.35,
                              0.05,
                              0.8
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              -0.15,
                              0.01,
                              0.2
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              0,
                              -0.02,
                              -0.9
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              -0.2,
                              0.02,
                              -0.2
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              -0.35,
                              0.05,
                              0.8
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "wing_right_root",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              -0.35,
                              -0.05,
                              -0.8
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              -0.15,
                              -0.01,
                              -0.2
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              0,
                              0.02,
                              0.9
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              -0.2,
                              -0.02,
                              0.2
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              -0.35,
                              -0.05,
                              -0.8
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "wing_left_tip",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.25,
                            "rotation": [
                              0,
                              0,
                              0.4
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              0,
                              0,
                              0.7
                            ]
                          },
                          {
                            "time": 0.75,
                            "rotation": [
                              0,
                              0,
                              0.4
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.25,
                            "rotation": [
                              0,
                              0,
                              -0.4
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              0,
                              0,
                              -0.7
                            ]
                          },
                          {
                            "time": 1.75,
                            "rotation": [
                              0,
                              0,
                              -0.4
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "wing_right_tip",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.25,
                            "rotation": [
                              0,
                              0,
                              -0.4
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              0,
                              0,
                              -0.7
                            ]
                          },
                          {
                            "time": 0.75,
                            "rotation": [
                              0,
                              0,
                              -0.4
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.25,
                            "rotation": [
                              0,
                              0,
                              0.4
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              0,
                              0,
                              0.7
                            ]
                          },
                          {
                            "time": 1.75,
                            "rotation": [
                              0,
                              0,
                              0.4
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "tail_1",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              0.1,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              -0.1,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "tail_2",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0.12,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              0.07,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              -0.12,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              -0.07,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0.12,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "tail_3",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0.16,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              -0.09,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              -0.16,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              0.09,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0.16,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "neck",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0.12,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              0.06,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              -0.12,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              0.06,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0.12,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "_head",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0.12,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              0.06,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              -0.12,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              0.06,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0.12,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "dragon_root",
                        "keyframes": [
                          {
                            "time": 0,
                            "position": [
                              0.08,
                              0.15,
                              0
                            ]
                          },
                          {
                            "time": 0.5,
                            "position": [
                              0,
                              0.35,
                              0.05
                            ]
                          },
                          {
                            "time": 1,
                            "position": [
                              -0.08,
                              0.55,
                              0
                            ]
                          },
                          {
                            "time": 1.5,
                            "position": [
                              0,
                              0.35,
                              -0.05
                            ]
                          },
                          {
                            "time": 2,
                            "position": [
                              0.08,
                              0.15,
                              0
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "name": "move",
                    "duration": 2,
                    "tracks": [
                      {
                        "targetTag": "wing_left_root",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              -0.35,
                              0.05,
                              0.8
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              -0.15,
                              0.01,
                              0.2
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              0,
                              -0.02,
                              -0.9
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              -0.2,
                              0.02,
                              -0.2
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              -0.35,
                              0.05,
                              0.8
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "wing_right_root",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              -0.35,
                              -0.05,
                              -0.8
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              -0.15,
                              -0.01,
                              -0.2
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              0,
                              0.02,
                              0.9
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              -0.2,
                              -0.02,
                              0.2
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              -0.35,
                              -0.05,
                              -0.8
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "wing_left_tip",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.25,
                            "rotation": [
                              0,
                              0,
                              0.4
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              0,
                              0,
                              0.7
                            ]
                          },
                          {
                            "time": 0.75,
                            "rotation": [
                              0,
                              0,
                              0.4
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.25,
                            "rotation": [
                              0,
                              0,
                              -0.4
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              0,
                              0,
                              -0.7
                            ]
                          },
                          {
                            "time": 1.75,
                            "rotation": [
                              0,
                              0,
                              -0.4
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "wing_right_tip",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.25,
                            "rotation": [
                              0,
                              0,
                              -0.4
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              0,
                              0,
                              -0.7
                            ]
                          },
                          {
                            "time": 0.75,
                            "rotation": [
                              0,
                              0,
                              -0.4
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.25,
                            "rotation": [
                              0,
                              0,
                              0.4
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              0,
                              0,
                              0.7
                            ]
                          },
                          {
                            "time": 1.75,
                            "rotation": [
                              0,
                              0,
                              0.4
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "tail_1",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              0.1,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              -0.1,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "tail_2",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0.12,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              0.07,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              -0.12,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              -0.07,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0.12,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "tail_3",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0.16,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              -0.09,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              -0.16,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              0.09,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0.16,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "neck",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0.12,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              0.06,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              -0.12,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              0.06,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0.12,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "_head",
                        "keyframes": [
                          {
                            "time": 0,
                            "rotation": [
                              0.12,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 0.5,
                            "rotation": [
                              0.06,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1,
                            "rotation": [
                              -0.12,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 1.5,
                            "rotation": [
                              0.06,
                              0,
                              0
                            ]
                          },
                          {
                            "time": 2,
                            "rotation": [
                              0.12,
                              0,
                              0
                            ]
                          }
                        ]
                      },
                      {
                        "targetTag": "dragon_root",
                        "keyframes": [
                          {
                            "time": 0,
                            "position": [
                              0.08,
                              0.15,
                              0
                            ]
                          },
                          {
                            "time": 0.5,
                            "position": [
                              0,
                              0.35,
                              0.05
                            ]
                          },
                          {
                            "time": 1,
                            "position": [
                              -0.08,
                              0.55,
                              0
                            ]
                          },
                          {
                            "time": 1.5,
                            "position": [
                              0,
                              0.35,
                              -0.05
                            ]
                          },
                          {
                            "time": 2,
                            "position": [
                              0.08,
                              0.15,
                              0
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              "Body": {
                "type": "composite",
                "params": {
                  "parts": [
                    {
                      "tag": "dragon_root",
                      "geometry": {
                        "type": "none"
                      },
                      "ignoreCollisions": true,
                      "children": [
                        {
                          "tag": "body",
                          "geometry": {
                            "type": "box",
                            "params": {
                              "lengthX": 2,
                              "lengthY": 1.2,
                              "lengthZ": 8
                            }
                          },
                          "material": {
                            "type": "solid",
                            "params": {
                              "color": "#151515",
                              "roughness": 0.9
                            }
                          },
                          "localPosition": [
                            0,
                            0,
                            0
                          ],
                          "children": [
                            {
                              "tag": "spine_0",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 0.4,
                                  "lengthY": 0.4,
                                  "lengthZ": 0.5
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#555555",
                                  "roughness": 0.6
                                }
                              },
                              "localPosition": [
                                0,
                                0.8,
                                -2.5
                              ]
                            },
                            {
                              "tag": "spine_1",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 0.4,
                                  "lengthY": 0.4,
                                  "lengthZ": 0.5
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#555555",
                                  "roughness": 0.6
                                }
                              },
                              "localPosition": [
                                0,
                                0.8,
                                -1.5
                              ]
                            },
                            {
                              "tag": "spine_2",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 0.4,
                                  "lengthY": 0.4,
                                  "lengthZ": 0.5
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#555555",
                                  "roughness": 0.6
                                }
                              },
                              "localPosition": [
                                0,
                                0.8,
                                -0.5
                              ]
                            },
                            {
                              "tag": "spine_3",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 0.4,
                                  "lengthY": 0.4,
                                  "lengthZ": 0.5
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#555555",
                                  "roughness": 0.6
                                }
                              },
                              "localPosition": [
                                0,
                                0.8,
                                0.5
                              ]
                            },
                            {
                              "tag": "spine_4",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 0.4,
                                  "lengthY": 0.4,
                                  "lengthZ": 0.5
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#555555",
                                  "roughness": 0.6
                                }
                              },
                              "localPosition": [
                                0,
                                0.8,
                                1.5
                              ]
                            },
                            {
                              "tag": "spine_5",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 0.4,
                                  "lengthY": 0.4,
                                  "lengthZ": 0.5
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#555555",
                                  "roughness": 0.6
                                }
                              },
                              "localPosition": [
                                0,
                                0.8,
                                2.5
                              ]
                            },
                            {
                              "tag": "neck",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 0.8,
                                  "lengthY": 0.8,
                                  "lengthZ": 3,
                                  "pivot": "back"
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#151515"
                                }
                              },
                              "localPosition": [
                                0,
                                0.1,
                                -4
                              ],
                              "children": [
                                {
                                  "tag": "_head",
                                  "geometry": {
                                    "type": "box",
                                    "params": {
                                      "lengthX": 1.4,
                                      "lengthY": 1.4,
                                      "lengthZ": 1.4,
                                      "pivot": "front"
                                    }
                                  },
                                  "material": {
                                    "type": "solid",
                                    "params": {
                                      "color": "#151515"
                                    }
                                  },
                                  "localPosition": [
                                    0,
                                    0.2,
                                    -3
                                  ],
                                  "localRotation": [
                                    0,
                                    3.141592653589793,
                                    0
                                  ],
                                  "children": [
                                    {
                                      "tag": "jaw",
                                      "geometry": {
                                        "type": "box",
                                        "params": {
                                          "lengthX": 1.1,
                                          "lengthY": 0.6,
                                          "lengthZ": 1.1,
                                          "pivot": "front"
                                        }
                                      },
                                      "material": {
                                        "type": "solid",
                                        "params": {
                                          "color": "#101010"
                                        }
                                      },
                                      "localPosition": [
                                        0,
                                        -0.2,
                                        1.4
                                      ]
                                    },
                                    {
                                      "tag": "eye_left",
                                      "geometry": {
                                        "type": "box",
                                        "params": {
                                          "lengthX": 0.3,
                                          "lengthY": 0.2,
                                          "lengthZ": 0.2
                                        }
                                      },
                                      "material": {
                                        "type": "solid",
                                        "params": {
                                          "color": "#d064ff",
                                          "metalness": 0.7,
                                          "roughness": 0.2
                                        }
                                      },
                                      "localPosition": [
                                        0.3,
                                        0.2,
                                        1.4
                                      ]
                                    },
                                    {
                                      "tag": "eye_right",
                                      "geometry": {
                                        "type": "box",
                                        "params": {
                                          "lengthX": 0.3,
                                          "lengthY": 0.2,
                                          "lengthZ": 0.2
                                        }
                                      },
                                      "material": {
                                        "type": "solid",
                                        "params": {
                                          "color": "#d064ff",
                                          "metalness": 0.7,
                                          "roughness": 0.2
                                        }
                                      },
                                      "localPosition": [
                                        -0.3,
                                        0.2,
                                        1.4
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "tag": "tail_1",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 1,
                                  "lengthY": 0.8,
                                  "lengthZ": 3,
                                  "pivot": "front"
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#151515"
                                }
                              },
                              "localPosition": [
                                0,
                                -0.1,
                                4
                              ],
                              "children": [
                                {
                                  "tag": "tail_2",
                                  "geometry": {
                                    "type": "box",
                                    "params": {
                                      "lengthX": 0.9,
                                      "lengthY": 0.7,
                                      "lengthZ": 3,
                                      "pivot": "front"
                                    }
                                  },
                                  "material": {
                                    "type": "solid",
                                    "params": {
                                      "color": "#151515"
                                    }
                                  },
                                  "localPosition": [
                                    0,
                                    -0.05,
                                    3
                                  ],
                                  "children": [
                                    {
                                      "tag": "tail_3",
                                      "geometry": {
                                        "type": "box",
                                        "params": {
                                          "lengthX": 0.8,
                                          "lengthY": 0.6,
                                          "lengthZ": 2.5,
                                          "pivot": "front"
                                        }
                                      },
                                      "material": {
                                        "type": "solid",
                                        "params": {
                                          "color": "#151515"
                                        }
                                      },
                                      "localPosition": [
                                        0,
                                        -0.05,
                                        3
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "tag": "wing_left_root",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 4,
                                  "lengthY": 0.3,
                                  "lengthZ": 1,
                                  "pivot": "left"
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#252525"
                                }
                              },
                              "localPosition": [
                                1,
                                0.1,
                                -1
                              ],
                              "children": [
                                {
                                  "tag": "wing_left_membrane_root",
                                  "geometry": {
                                    "type": "box",
                                    "params": {
                                      "lengthX": 4,
                                      "lengthY": 0.08,
                                      "lengthZ": 3.2,
                                      "pivot": "front"
                                    }
                                  },
                                  "material": {
                                    "type": "solid",
                                    "params": {
                                      "color": "#151515",
                                      "roughness": 0.95
                                    }
                                  },
                                  "localPosition": [
                                    2,
                                    0,
                                    0
                                  ],
                                  "localRotation": [
                                    0.08,
                                    0,
                                    0
                                  ],
                                  "ignoreCollisions": true
                                },
                                {
                                  "tag": "wing_left_tip",
                                  "geometry": {
                                    "type": "box",
                                    "params": {
                                      "lengthX": 3.5,
                                      "lengthY": 0.25,
                                      "lengthZ": 0.8,
                                      "pivot": "left"
                                    }
                                  },
                                  "material": {
                                    "type": "solid",
                                    "params": {
                                      "color": "#202020"
                                    }
                                  },
                                  "localPosition": [
                                    4,
                                    0,
                                    0
                                  ],
                                  "children": [
                                    {
                                      "tag": "wing_left_membrane_tip",
                                      "geometry": {
                                        "type": "box",
                                        "params": {
                                          "lengthX": 3.5,
                                          "lengthY": 0.06,
                                          "lengthZ": 3,
                                          "pivot": "front"
                                        }
                                      },
                                      "material": {
                                        "type": "solid",
                                        "params": {
                                          "color": "#151515",
                                          "roughness": 0.95
                                        }
                                      },
                                      "localPosition": [
                                        1.75,
                                        0,
                                        0
                                      ],
                                      "localRotation": [
                                        0.06,
                                        0,
                                        0
                                      ],
                                      "ignoreCollisions": true
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "tag": "wing_right_root",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 4,
                                  "lengthY": 0.3,
                                  "lengthZ": 1,
                                  "pivot": "right"
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#252525"
                                }
                              },
                              "localPosition": [
                                -1,
                                0.1,
                                -1
                              ],
                              "children": [
                                {
                                  "tag": "wing_right_membrane_root",
                                  "geometry": {
                                    "type": "box",
                                    "params": {
                                      "lengthX": 4,
                                      "lengthY": 0.08,
                                      "lengthZ": 3.2,
                                      "pivot": "front"
                                    }
                                  },
                                  "material": {
                                    "type": "solid",
                                    "params": {
                                      "color": "#151515",
                                      "roughness": 0.95
                                    }
                                  },
                                  "localPosition": [
                                    -2,
                                    0,
                                    0
                                  ],
                                  "localRotation": [
                                    0.08,
                                    0,
                                    0
                                  ],
                                  "ignoreCollisions": true
                                },
                                {
                                  "tag": "wing_right_tip",
                                  "geometry": {
                                    "type": "box",
                                    "params": {
                                      "lengthX": 3.5,
                                      "lengthY": 0.25,
                                      "lengthZ": 0.8,
                                      "pivot": "right"
                                    }
                                  },
                                  "material": {
                                    "type": "solid",
                                    "params": {
                                      "color": "#202020"
                                    }
                                  },
                                  "localPosition": [
                                    -4,
                                    0,
                                    0
                                  ],
                                  "children": [
                                    {
                                      "tag": "wing_right_membrane_tip",
                                      "geometry": {
                                        "type": "box",
                                        "params": {
                                          "lengthX": 3.5,
                                          "lengthY": 0.06,
                                          "lengthZ": 3,
                                          "pivot": "front"
                                        }
                                      },
                                      "material": {
                                        "type": "solid",
                                        "params": {
                                          "color": "#151515",
                                          "roughness": 0.95
                                        }
                                      },
                                      "localPosition": [
                                        -1.75,
                                        0,
                                        0
                                      ],
                                      "localRotation": [
                                        0.06,
                                        0,
                                        0
                                      ],
                                      "ignoreCollisions": true
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "tag": "leg_front_left",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 0.6,
                                  "lengthY": 1.2,
                                  "lengthZ": 0.6
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#151515"
                                }
                              },
                              "localPosition": [
                                0.8,
                                -0.8,
                                -2.5
                              ]
                            },
                            {
                              "tag": "leg_front_right",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 0.6,
                                  "lengthY": 1.2,
                                  "lengthZ": 0.6
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#151515"
                                }
                              },
                              "localPosition": [
                                -0.8,
                                -0.8,
                                -2.5
                              ]
                            },
                            {
                              "tag": "leg_back_left",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 0.6,
                                  "lengthY": 1.2,
                                  "lengthZ": 0.6
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#151515"
                                }
                              },
                              "localPosition": [
                                0.8,
                                -0.8,
                                1.5
                              ]
                            },
                            {
                              "tag": "leg_back_right",
                              "geometry": {
                                "type": "box",
                                "params": {
                                  "lengthX": 0.6,
                                  "lengthY": 1.2,
                                  "lengthZ": 0.6
                                }
                              },
                              "material": {
                                "type": "solid",
                                "params": {
                                  "color": "#151515"
                                }
                              },
                              "localPosition": [
                                -0.8,
                                -0.8,
                                1.5
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              },
              "Faction": {
                "id": "player_faction"
              },
              "Health": {
                "value": 250,
                "maxValue": 250
              },
              "Info": {
                "name": "Ender Dragon",
                "description": "A massive obsidian-scaled dragon with blazing violet eyes and sweeping wings."
              },
              "MotionSource": {
                "type": "characterController",
                "params": {
                  "speed": 7,
                  "jumpHeight": 0,
                  "canFly": true
                }
              },
              "StableID": {
                "id": 0
              },
              "Transform": {
                "x": 0,
                "y": 0,
                "z": 0,
                "qx": 0,
                "qy": 0,
                "qz": 0,
                "qw": 1,
                "sx": 1,
                "sy": 1,
                "sz": 1
              },
              "Stock": {
                "health": {
                  "current": 250,
                  "max": 250,
                  "min": 0
                }
              },
              "Rules": [
                {
                  "trigger": {
                    "type": "die"
                  },
                  "actions": {
                    "type": "sequence",
                    "params": {
                      "actions": [
                        {
                          "type": "spawnEntityFrom",
                          "params": {
                            "entity": "dragon_egg",
                            "velocity": 0
                          },
                          "target": "self"
                        }
                      ]
                    }
                  }
                }
              ],
              "Stores": [
                {
                  "store": "health",
                  "value": {
                    "current": 250,
                    "max": 250,
                    "min": 0
                  }
                }
              ]
            }
          ],
          "entityCount": 1,
          "version": 1,
          "updatedAt": 1773867315786
        }
      ]
    }
  ],
  "activeDimension": "Blank",
  "achievements": [],
  "createdAt": 1773867315786,
  "updatedAt": 1773867315786,
  "serializedAt": 1773867315786,
  "engineVersion": "0.3.0",
  "nextStableId": 1
};

export default {
  setupScene(api) {
    const { initialize } = api;
    console.log('Loading world from saved state');
    
    // Initialize world from saved definition
    // Note: api.initialize is already bound to ctx, so we don't pass it again
    initialize(worldDefinition, {
      spawnEntities: true,
      merge: false
    });
    
    console.log('World loaded from saved state');
  }
};
