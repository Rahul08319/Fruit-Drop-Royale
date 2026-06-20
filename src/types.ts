export type GameMode = 'classic' | 'royale';

export type GameState = 'menu' | 'playing' | 'gameover' | 'victory';

export type FacialExpression = 'happy' | 'scared' | 'excited' | 'dizzy' | 'surprised' | 'sleeping';

export interface FruitConfig {
  id: number;
  name: string;
  radius: number; // base rendering size
  color: string;
  gradientColors: [string, string];
  emoji: string;
  scoreValue: number;
  shapeType: 'circle' | 'strawberry' | 'banana' | 'pineapple' | 'apple';
  mass: number;
  friction: number;
  restitution: number; // bounciness
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
  vy: number;
  life: number;
}

export interface Opponent {
  id: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
  status: 'alive' | 'dead';
  eliminatedRank?: number;
  // Simulated small-scale state for thumbnail rendering
  fruitCount: number;
  topLineFactor: number; // 0 (empty) to 1 (full / dangerously close to dead)
  gridFruits: Array<{ x: number; y: number; r: number; color: string }>;
  dropCooldown: number;
  skill: number; // difficulty tier (0.5 to 1.5 multiplier on speed/score)
}

export interface LocalScore {
  name: string;
  score: number;
  mode: GameMode;
  date: string;
}

export const FRUITS: FruitConfig[] = [
  {
    id: 0,
    name: 'Cherry',
    radius: 12,
    color: '#FF2A4B',
    gradientColors: ['#FF4D6D', '#C9002B'],
    emoji: '🍒',
    scoreValue: 1,
    shapeType: 'circle',
    mass: 0.8,
    friction: 0.1,
    restitution: 0.45, // very bouncy!
  },
  {
    id: 1,
    name: 'Strawberry',
    radius: 18,
    color: '#FF3B30',
    gradientColors: ['#FF5E5B', '#D00000'],
    emoji: '🍓',
    scoreValue: 3,
    shapeType: 'strawberry', // triangular
    mass: 1.2,
    friction: 0.25,
    restitution: 0.2, // low bounce, rolls weirdly
  },
  {
    id: 2,
    name: 'Grape',
    radius: 24,
    color: '#AF52DE',
    gradientColors: ['#C37FFF', '#7B1FA2'],
    emoji: '🍇',
    scoreValue: 6,
    shapeType: 'circle',
    mass: 1.5,
    friction: 0.15,
    restitution: 0.3,
  },
  {
    id: 3,
    name: 'Lime',
    radius: 30,
    color: '#34C759',
    gradientColors: ['#4CD964', '#1E824C'],
    emoji: '🍋',
    scoreValue: 10,
    shapeType: 'circle',
    mass: 2.0,
    friction: 0.12,
    restitution: 0.25,
  },
  {
    id: 4,
    name: 'Orange',
    radius: 38,
    color: '#FF9500',
    gradientColors: ['#FFAE42', '#E05300'],
    emoji: '🍊',
    scoreValue: 15,
    shapeType: 'circle',
    mass: 2.8,
    friction: 0.1,
    restitution: 0.22,
  },
  {
    id: 5,
    name: 'Apple',
    radius: 46,
    color: '#FF3B30',
    gradientColors: ['#FF6B6B', '#A81414'],
    emoji: '🍎',
    scoreValue: 21,
    shapeType: 'apple', // slightly bottom-indented
    mass: 3.8,
    friction: 0.18,
    restitution: 0.18,
  },
  {
    id: 6,
    name: 'Peach',
    radius: 54,
    color: '#FF9F0A',
    gradientColors: ['#FFB480', '#E06500'],
    emoji: '🍑',
    scoreValue: 28,
    shapeType: 'circle',
    mass: 5.0,
    friction: 0.14,
    restitution: 0.15,
  },
  {
    id: 7,
    name: 'Banana',
    radius: 62, // long length but curve shapes
    color: '#FFCC00',
    gradientColors: ['#FFE066', '#D6A300'],
    emoji: '🍌',
    scoreValue: 36,
    shapeType: 'banana', // long, banana-shaped crescent!
    mass: 6.2,
    friction: 0.28, // slides a bit, rolls with high resistance
    restitution: 0.12,
  },
  {
    id: 8,
    name: 'Pineapple',
    radius: 72,
    color: '#FFCC00',
    gradientColors: ['#FFD54F', '#FFA000'],
    emoji: '🍍',
    scoreValue: 45,
    shapeType: 'pineapple', // oval-hexagonal with flat top
    mass: 8.0,
    friction: 0.35, // quite sticky leaf crowns
    restitution: 0.08,
  },
  {
    id: 9,
    name: 'Cantaloupe',
    radius: 84,
    color: '#FFCC66',
    gradientColors: ['#FFE0B2', '#E65100'],
    emoji: '🍈',
    scoreValue: 55,
    shapeType: 'circle',
    mass: 10.5,
    friction: 0.08,
    restitution: 0.1,
  },
  {
    id: 10,
    name: 'Melon',
    radius: 100,
    color: '#2ECC71',
    gradientColors: ['#58D68D', '#1D8348'],
    emoji: '🍉',
    scoreValue: 66,
    shapeType: 'circle',
    mass: 14.0,
    friction: 0.05,
    restitution: 0.05,
  },
];
