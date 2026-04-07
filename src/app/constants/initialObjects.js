const SLINGSHOT_BASE_ID = 'slingshot-base';
const SLINGSHOT_PROJECTILE_ID = 'slingshot';
const SLINGSHOT_BASE_POSITION = { x: 320, y: 440 };
const SLINGSHOT_BASE_SIZE = { width: 260, height: 30 };
const SLINGSHOT_PROJECTILE_SIZE = 40;
const SLINGSHOT_MAX_FORCE = 1000;

const createSlingshotBase = () => ({
  id: SLINGSHOT_BASE_ID,
  name: 'Slingshot Base',
  type: 'rect',
  x: SLINGSHOT_BASE_POSITION.x - SLINGSHOT_BASE_SIZE.width / 2,
  y: SLINGSHOT_BASE_POSITION.y - SLINGSHOT_BASE_SIZE.height / 2,
  width: SLINGSHOT_BASE_SIZE.width,
  height: SLINGSHOT_BASE_SIZE.height,
  fillColor: '#1e293b',
  borderRadius: 16,
  locked: true,
  behaviors: [
    {
      id: 'bh-slingshot-drop',
      trigger: 'onSlingshotDrop',
      behaviorTree: {
        node: 'inside',
        child: {
          node: 'action',
          name: 'launch',
          params: {
            useDragVector: true,
            dragMultiplier: 5.0,
            maxForce: SLINGSHOT_MAX_FORCE,
            duration: 520
          }
        }
      }
    }
  ]
});

const createSlingshotProjectile = () => ({
  id: SLINGSHOT_PROJECTILE_ID,
  name: 'Slingshot Projectile',
  type: 'circle',
  x: SLINGSHOT_BASE_POSITION.x - SLINGSHOT_PROJECTILE_SIZE / 2,
  y: SLINGSHOT_BASE_POSITION.y - SLINGSHOT_PROJECTILE_SIZE / 2,
  width: SLINGSHOT_PROJECTILE_SIZE,
  height: SLINGSHOT_PROJECTILE_SIZE,
  fillColor: '#f87171',
  behaviors: []
});

const createLauncherBase = () => ({
  id: 'launcher-base',
  name: 'Launcher Base',
  type: 'rect',
  x: 480,
  y: 420,
  width: 220,
  height: 50,
  fillColor: '#b45309',
  borderRadius: 26,
  behaviors: [
    {
      id: 'bh-launch',
      trigger: 'onClick',
      behaviorTree: {
        node: 'inside',
        child: {
          node: 'action',
          name: 'launch',
          params: {
            dx: 160,
            dy: -60,
            duration: 320
          }
        }
      }
    }
  ]
});

export const INITIAL_OBJECTS = [
  {
    id: 'obj-1',
    name: 'Object_1',
    type: 'rect',
    x: 100,
    y: 100,
    width: 80,
    height: 80,
    fillColor: '#3862f6',
    borderRadius: 8,
    behaviors: [
      {
        id: 'bh-1',
        name: 'Rotate Intro',
        action: 'rotate',
        duration: 1.0,
        params: { rotation: 360 },
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      }
    ]
  },
  {
    id: 'obj-2',
    name: 'Title Text',
    type: 'text',
    x: 100,
    y: 50,
    text: 'Hello IdeaWeave',
    fontSize: 18,
    fillColor: '#1e293b',
    behaviors: [
      {
        id: 'bh-2',
        name: 'Fade Intro',
        action: 'fade',
        duration: 1.0,
        params: { opacity: 1 },
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      }
    ]
  },
  {
    id: 'rect-1',
    name: 'Sample Rect',
    type: 'rect',
    width: 50,
    height: 50,
    x: 100,
    y: 100,
    fillColor: '#00ff00',
    behaviors: [
      {
        id: 'rect-1',
        trigger: 'onClick',
        behaviorTree: {
          node: 'action',
          name: 'modify',
          params: { color: 'red' }
        }
      }
    ]
  },
  {
    id: 'obj-3',
    name: 'Interactive Square',
    type: 'rect',
    x: 320,
    y: 220,
    width: 110,
    height: 110,
    fillColor: '#10b981',
    borderRadius: 12,
    behaviors: [
      {
        id: 'bh-3',
        trigger: 'onClick',
        behaviorTree: {
          node: 'sequence',
          children: [
            {
              node: 'action',
              name: 'scale',
              params: { scaleX: 1.25, scaleY: 1.25 },
              duration: 400
            },
            {
              node: 'action',
              name: 'wait',
              params: { duration: 300 }
            },
            {
              node: 'action',
              name: 'scale',
              params: { scaleX: 1.0, scaleY: 1.0 },
              duration: 300
            }
          ]
        }
      },
      {
        id: 'bh-4',
        trigger: 'onDrag',
        behaviorTree: {
          node: 'action',
          name: 'modify',
          params: {
            color: '#ef4444'
          }
        }
      }
    ]
  },
  createSlingshotBase(),
  createSlingshotProjectile(),
  createLauncherBase(),
  {
    id: 'projectile-1',
    name: 'Launcher Projectile',
    type: 'circle',
    x: 540,
    y: 380,
    width: 40,
    height: 40,
    fillColor: '#f97316',
    behaviors: []
  },
  {
    id: 'box-area',
    name: 'Box Area',
    type: 'rect',
    x: 520,
    y: 420,
    width: 240,
    height: 120,
    fillColor: '#64748b',
    borderRadius: 12,
    behaviors: [
      {
        id: 'box-click',
        trigger: 'onClick',
        behaviorTree: {
          node: 'inside',
          child: {
            node: 'action',
            name: 'modify',
            params: {
              color: '#dc2626'
            }
          }
        }
      }
    ]
  },
  {
    id: 'box-item-1',
    name: 'Box Item 1',
    type: 'rect',
    x: 540,
    y: 450,
    width: 60,
    height: 60,
    fillColor: '#fbbf24',
    behaviors: []
  },
  {
    id: 'box-item-2',
    name: 'Box Item 2',
    type: 'rect',
    x: 620,
    y: 450,
    width: 60,
    height: 60,
    fillColor: '#0ea5e9',
    behaviors: []
  }
];

export {
  SLINGSHOT_BASE_ID, SLINGSHOT_BASE_POSITION,
  SLINGSHOT_BASE_SIZE, SLINGSHOT_MAX_FORCE, SLINGSHOT_PROJECTILE_ID, SLINGSHOT_PROJECTILE_SIZE
};

