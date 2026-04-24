/**
 * MotionSource Component Schema
 * Physics motion behavior (static, dynamic, character controller)
 */

import { ComponentSchema } from '../FieldMetadata';

export const MotionSourceSchema: ComponentSchema = {
  name: 'MotionSource',
  displayName: 'Motion Source',
  description: 'Physics motion behavior and control',
  isStructural: true, // Changing motion type requires entity respawn
  icon: 'motion', // Figma-like icon for component header
  inspectorTab: 'simulate',
  
  fields: {
    type: {
      name: 'type',
      type: 'enum',
      enumValues: ['static', 'dynamicRigidBody', 'characterController', 'vehicleController'],
      enumOptions: [
        { value: 'static', icon: 'world', label: 'Static' },
        { value: 'dynamicRigidBody', icon: 'motion', label: 'Rigid Body' },
        { value: 'characterController', icon: 'user', label: 'Character' },
        { value: 'vehicleController', icon: 'tool', label: 'Vehicle' },
      ],
      required: true,
      defaultValue: 'static',
      label: 'Motion Type',
      description: 'Type of physics motion'
    },
    
    params: {
      name: 'params',
      type: 'union',
      discriminator: 'type',
      required: false,
      unionTypes: {
        static: [],
        
        dynamicRigidBody: [
          {
            name: 'mass',
            type: 'number',
            required: false,
            defaultValue: 1,
            min: 0.01,
            step: 0.1,
            label: 'Mass',
            description: 'Mass of the rigid body in kg'
          },
          {
            name: 'gravityScale',
            type: 'number',
            required: false,
            defaultValue: 1,
            min: 0,
            step: 0.1,
            label: 'Gravity Scale',
            description: 'Multiplier for gravity (0 = no gravity, 1 = normal)'
          }
        ],

        characterController: [
          {
            name: 'speed',
            type: 'number',
            required: false,
            defaultValue: 5,
            min: 0,
            step: 0.5,
            label: 'Speed',
            description: 'Movement speed in units/second'
          },
          {
            name: 'sprintSpeed',
            type: 'number',
            required: false,
            defaultValue: 10,
            min: 0,
            step: 0.5,
            label: 'Sprint Speed',
            description: 'Sprint speed in units/second'
          },
          {
            name: 'jumpHeight',
            type: 'number',
            required: false,
            defaultValue: 2,
            min: 0,
            step: 0.1,
            label: 'Jump Height',
            description: 'Maximum jump height in units'
          },
          {
            name: 'canFly',
            type: 'boolean',
            required: false,
            defaultValue: false,
            label: 'Can Fly',
            description: 'Whether the character can fly'
          },
          {
            name: 'offset',
            type: 'number',
            required: false,
            defaultValue: 0.05,
            min: 0,
            step: 0.01,
            label: 'Controller Offset'
          }
        ],
        
        vehicleController: []
      }
    }
  },
  
  requiredFields: ['type']
};
