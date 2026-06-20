import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { FRUITS, FruitConfig, GameMode, Opponent, Particle, FloatingText } from '../types';
import { synths } from '../utils/audio';
import { RefreshCw, Play, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

interface GameCanvasProps {
  mode: GameMode;
  gameState: 'playing' | 'gameover' | 'victory';
  onScoreUpdate: (score: number) => void;
  onGameOver: () => void;
  onOpponentsUpdate?: (opponents: Opponent[]) => void;
  onNextFruitSelection?: (index: number) => void;
  playerRank: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  mode,
  gameState,
  onScoreUpdate,
  onGameOver,
  onOpponentsUpdate,
  onNextFruitSelection,
  playerRank,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References for Matter-JS engines
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const fruitsGroupRef = useRef<Matter.Composite | null>(null);

  // Game state
  const [currentFruitIdx, setCurrentFruitIdx] = useState<number>(0);
  const [nextFruitIdx, setNextFruitIdx] = useState<number>(1);
  const playerScoreRef = useRef<number>(0);
  const [cooldown, setCooldown] = useState<boolean>(false);
  const [dangerAlert, setDangerAlert] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Propagate next fruit selection to parent
  useEffect(() => {
    if (onNextFruitSelection) {
      onNextFruitSelection(nextFruitIdx);
    }
  }, [nextFruitIdx, onNextFruitSelection]);

  // Constants
  const width = 450;
  const height = 650;
  const warningY = 140; // line of danger

  // Aiming state
  const [aimX, setAimX] = useState<number>(width / 2);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  // Interactive animation particles
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const fruitsMetadata = useRef<Map<number, {
    fruitId: number;
    spawnTime: number;
    squishX: number;
    squishY: number;
    lastBlink: number;
    isBlinking: boolean;
    blinkDuration: number;
    expression: 'happy' | 'scared' | 'excited' | 'sleeping' | 'default';
    sleepTimer: number;
    isSettled: boolean;
  }>>(new Map());

  // Opponents simulation (Royale mode)
  const opponentsRef = useRef<Opponent[]>([]);
  const playerRankRef = useRef<number>(playerRank);

  // Track combo streaks
  const comboStreakRef = useRef<number>(0);
  const lastMergeTimeRef = useRef<number>(0);

  // Initialize Audio
  useEffect(() => {
    setIsMuted(synths.getMute());
  }, []);

  const toggleSound = () => {
    const muted = synths.toggleMute();
    setIsMuted(muted);
  };

  // Generate a random preview fruit (cherry to lime index 0-3 initially)
  const getRandomSpawnFruitIdx = () => {
    return Math.floor(Math.random() * 4); // cherry, strawberry, grape, lime
  };

  // Initialize Royale Opponents once
  useEffect(() => {
    if (mode === 'royale') {
      const initialOpponents: Opponent[] = [
        { id: '1', name: 'Giga Melon 🍉', avatar: '🍉', color: '#10b981', score: 0, status: 'alive', topLineFactor: 0, fruitCount: 0, gridFruits: [], dropCooldown: 0, skill: 1.4 },
        { id: '2', name: 'Pineapple King 🍍', avatar: '🍍', color: '#f59e0b', score: 0, status: 'alive', topLineFactor: 0, fruitCount: 0, gridFruits: [], dropCooldown: 0, skill: 1.25 },
        { id: '3', name: 'Peach Princess 🍑', avatar: '🍑', color: '#f97316', score: 0, status: 'alive', topLineFactor: 0, fruitCount: 0, gridFruits: [], dropCooldown: 0, skill: 1.15 },
        { id: '4', name: 'Apple Carver 🍎', avatar: '🍎', color: '#ef4444', score: 0, status: 'alive', topLineFactor: 0, fruitCount: 0, gridFruits: [], dropCooldown: 0, skill: 1.05 },
        { id: '5', name: 'Citrus Squeezer 🍋', avatar: '🍋', color: '#eab308', score: 0, status: 'alive', topLineFactor: 0, fruitCount: 0, gridFruits: [], dropCooldown: 0, skill: 0.95 },
        { id: '6', name: 'Berry Popper 🍓', avatar: '🍓', color: '#ec4899', score: 0, status: 'alive', topLineFactor: 0, fruitCount: 0, gridFruits: [], dropCooldown: 0, skill: 0.85 },
        { id: '7', name: 'Grape Crusher 🍇', avatar: '🍇', color: '#8b5cf6', score: 0, status: 'alive', topLineFactor: 0, fruitCount: 0, gridFruits: [], dropCooldown: 0, skill: 0.75 },
        { id: '8', name: 'Supa Cherry 🍒', avatar: '🍒', color: '#f43f5e', score: 0, status: 'alive', topLineFactor: 0, fruitCount: 0, gridFruits: [], dropCooldown: 0, skill: 0.65 },
        { id: '9', name: 'Banana Slinger 🍌', avatar: '🍌', color: '#facc15', score: 0, status: 'alive', topLineFactor: 0, fruitCount: 0, gridFruits: [], dropCooldown: 0, skill: 0.55 },
      ];
      opponentsRef.current = initialOpponents;
      if (onOpponentsUpdate) {
        onOpponentsUpdate(initialOpponents);
      }
    }
  }, [mode]);

  // Matter Engine Setup
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Create custom engine
    const engine = Matter.Engine.create({
      gravity: { y: 1.0, scale: 0.001 },
    });
    engineRef.current = engine;

    // Create custom composite for trackable fruits
    const fruitsGroup = Matter.Composite.create();
    fruitsGroupRef.current = fruitsGroup;
    Matter.Composite.add(engine.world, fruitsGroup);

    // Setup bounding containers
    const wallOptions = {
      isStatic: true,
      friction: 0.5,
      restitution: 0.2,
    };

    const floor = Matter.Bodies.rectangle(width / 2, height + 80, width * 2, 200, wallOptions);
    const leftWall = Matter.Bodies.rectangle(-80, height / 2, 180, height * 2, wallOptions);
    const rightWall = Matter.Bodies.rectangle(width + 80, height / 2, 180, height * 2, wallOptions);

    Matter.Composite.add(engine.world, [floor, leftWall, rightWall]);

    // Create a runner
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    // Dynamic scale lists for spawn setup
    setCurrentFruitIdx(getRandomSpawnFruitIdx());
    setNextFruitIdx(getRandomSpawnFruitIdx());
    playerScoreRef.current = 0;
    onScoreUpdate(0);
    comboStreakRef.current = 0;

    // Handle Collisions natively and trigger merges
    Matter.Events.on(engine, 'collisionStart', handleCollisions);

    // Clean up
    return () => {
      stopPhysics();
    };
  }, [gameState]);

  const stopPhysics = () => {
    if (runnerRef.current) {
      Matter.Runner.stop(runnerRef.current);
    }
    if (engineRef.current) {
      Matter.Engine.clear(engineRef.current);
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    fruitsMetadata.current.clear();
  };

  // Setup standard collision merging logic
  const handleCollisions = (event: Matter.IEventCollision<Matter.Engine>) => {
    const pairs = event.pairs;
    const engine = engineRef.current;
    const fruitsGroup = fruitsGroupRef.current;
    if (!engine || !fruitsGroup) return;

    const mergedToSpawn: Array<{ x: number; y: number; nextId: number }> = [];

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      // Extract metadata
      const metaA = fruitsMetadata.current.get(bodyA.id);
      const metaB = fruitsMetadata.current.get(bodyB.id);

      if (metaA && metaB && metaA.fruitId === metaB.fruitId) {
        // Prevent double triggers
        const fruitId = metaA.fruitId;

        // Ensure we don't trigger merges for already merged items or items level 10 (Melon max level)
        if (bodyA.isStatic || bodyB.isStatic || fruitId >= 10) continue;

        // Highlight squish animation on impact
        metaA.squishX = 0.8;
        metaA.squishY = 1.1;
        metaB.squishX = 0.8;
        metaB.squishY = 1.1;

        // Perform merge
        const midX = (bodyA.position.x + bodyB.position.x) / 2;
        const midY = (bodyA.position.y + bodyB.position.y) / 2;

        // Mark bodies as static so they don't collide anymore
        Matter.Body.setStatic(bodyA, true);
        Matter.Body.setStatic(bodyB, true);

        // Track composite fruits for safe removal
        Matter.Composite.remove(fruitsGroup, bodyA);
        Matter.Composite.remove(fruitsGroup, bodyB);

        fruitsMetadata.current.delete(bodyA.id);
        fruitsMetadata.current.delete(bodyB.id);

        mergedToSpawn.push({ x: midX, y: midY, nextId: fruitId + 1 });
      }
    }

    // Spawn merged elements
    if (mergedToSpawn.length > 0) {
      const now = Date.now();
      // Manage combo sequence
      if (now - lastMergeTimeRef.current < 1200) {
        comboStreakRef.current += 1;
      } else {
        comboStreakRef.current = 1;
      }
      lastMergeTimeRef.current = now;

      mergedToSpawn.forEach(({ x, y, nextId }) => {
        spawnFruitAt(x, y, nextId, comboStreakRef.current);
      });
    }
  };

  // Helper inside physics loop to spawn specific fruit types
  const spawnFruitAt = (x: number, y: number, fruitId: number, currentCombo: number) => {
    const engine = engineRef.current;
    const fruitsGroup = fruitsGroupRef.current;
    if (!engine || !fruitsGroup) return;

    const config = FRUITS[fruitId];

    // Build shape options
    const options: Matter.IBodyDefinition = {
      friction: config.friction,
      restitution: config.restitution,
      mass: config.mass,
      density: 0.001 * config.mass,
      plugin: { fruitId },
    };

    let body: Matter.Body;

    // Create shapes depending on their characteristic
    if (config.shapeType === 'strawberry') {
      // Triangle body for organic strawberry feel
      body = Matter.Bodies.polygon(x, y, 3, config.radius * 1.05, options);
      Matter.Body.setAngle(body, Math.PI); // point downwards standard
    } else if (config.shapeType === 'banana') {
      // Banana crescent: compound body of overlapping circles to create rocking curvature
      const r = config.radius;
      const part1 = Matter.Bodies.circle(x - r / 2, y, r * 0.45, options);
      const part2 = Matter.Bodies.circle(x, y - r / 6, r * 0.48, options);
      const part3 = Matter.Bodies.circle(x + r / 2, y, r * 0.45, options);
      
      body = Matter.Body.create({
        parts: [part1, part2, part3],
        friction: config.friction,
        restitution: config.restitution,
        mass: config.mass,
      });
      Matter.Body.setPosition(body, { x, y });
    } else if (config.shapeType === 'pineapple') {
      // Hexagon / oval body shape
      body = Matter.Bodies.polygon(x, y, 6, config.radius * 1.05, options);
    } else {
      // Standard circles representing cherries, oranges, apples, plums, melons
      body = Matter.Bodies.circle(x, y, config.radius, options);
    }

    Matter.Composite.add(fruitsGroup, body);

    // Save metadata
    fruitsMetadata.current.set(body.id, {
      fruitId,
      spawnTime: Date.now(),
      squishX: 1.3, // poof spawn stretch
      squishY: 0.7,
      lastBlink: Date.now() + Math.random() * 2000,
      isBlinking: false,
      blinkDuration: 120,
      expression: 'happy',
      sleepTimer: 0,
      isSettled: false,
    });

    // Score increments
    const gain = config.scoreValue;
    playerScoreRef.current += gain;
    onScoreUpdate(playerScoreRef.current);

    // Splat Sound with multi-pitch
    synths.playMergeSound(fruitId, currentCombo);

    // Generate juicy cartoon splatter particles
    createSplatterParticles(x, y, config.color);

    // Floating text feedback (+Combo points!)
    let feedbackText = `+${gain}`;
    if (currentCombo >= 2) {
      feedbackText = `+${gain} combo x${currentCombo}!`;
    }
    addFloatingText(x, y - config.radius, feedbackText, config.color);
  };

  // Spark and Splat dynamic 2D canvas particles
  const createSplatterParticles = (x: number, y: number, color: string) => {
    const pCount = 14 + Math.random() * 8;
    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (1 + Math.random() * 3), // splash up
        size: 3 + Math.random() * 6,
        color,
        alpha: 1,
        life: 0,
        maxLife: 40 + Math.random() * 25,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random(),
      x,
      y,
      text,
      color,
      alpha: 1,
      scale: 1,
      vy: -1.2 - Math.random() * 0.8,
      life: 0,
    });
  };

  // Drop selected fruit
  const handleDropFruit = () => {
    if (cooldown || gameState !== 'playing') return;

    // Set cooldown
    setCooldown(true);
    synths.playDropSound();

    const engine = engineRef.current;
    const fruitsGroup = fruitsGroupRef.current;
    if (engine && fruitsGroup) {
      const config = FRUITS[currentFruitIdx];

      // Enforce container boundary bounds representing walls so fruit doesn't slip through
      const margin = 15;
      const spawnX = Math.max(margin + config.radius, Math.min(width - margin - config.radius, aimX));
      const spawnY = warningY - 40; // drop from just above boundary line

      const options: Matter.IBodyDefinition = {
        friction: config.friction,
        restitution: config.restitution,
        mass: config.mass,
        density: 0.001 * config.mass,
        plugin: { fruitId: currentFruitIdx },
      };

      let body: Matter.Body;

      if (config.shapeType === 'strawberry') {
        body = Matter.Bodies.polygon(spawnX, spawnY, 3, config.radius * 1.05, options);
        Matter.Body.setAngle(body, Math.PI);
      } else if (config.shapeType === 'banana') {
        const r = config.radius;
        const part1 = Matter.Bodies.circle(spawnX - r / 2, spawnY, r * 0.45, options);
        const part2 = Matter.Bodies.circle(spawnX, spawnY - r / 6, r * 0.48, options);
        const part3 = Matter.Bodies.circle(spawnX + r / 2, spawnY, r * 0.45, options);
        
        body = Matter.Body.create({
          parts: [part1, part2, part3],
          friction: config.friction,
          restitution: config.restitution,
          mass: config.mass,
        });
        Matter.Body.setPosition(body, { x: spawnX, y: spawnY });
      } else if (config.shapeType === 'pineapple') {
        body = Matter.Bodies.polygon(spawnX, spawnY, 6, config.radius * 1.05, options);
      } else {
        body = Matter.Bodies.circle(spawnX, spawnY, config.radius, options);
      }

      // Slightly rotate to give natural physics tumble
      Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.5);

      Matter.Composite.add(fruitsGroup, body);

      // Register metadata
      fruitsMetadata.current.set(body.id, {
        fruitId: currentFruitIdx,
        spawnTime: Date.now(),
        squishX: 0.9,
        squishY: 1.15,
        lastBlink: Date.now() + Math.random() * 2000,
        isBlinking: false,
        blinkDuration: 125,
        expression: 'surprised', // popped drop expression
        sleepTimer: 0,
        isSettled: false,
      });
    }

    // Swap previews
    setTimeout(() => {
      setCurrentFruitIdx(nextFruitIdx);
      setNextFruitIdx(getRandomSpawnFruitIdx());
      setCooldown(false);
    }, 600); // 600ms responsive reload
  };

  // Main Canvas Rendering Loop
  useEffect(() => {
    let lastTime = requestAnimationFrame(animate);

    function animate(now: number) {
      if (gameState !== 'playing') {
        animationFrameId.current = requestAnimationFrame(animate);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const engine = engineRef.current;
      const fruitsGroup = fruitsGroupRef.current;

      if (canvas && ctx && engine && fruitsGroup) {
        // Dynamic resize helper
        ctx.clearRect(0, 0, width, height);

        // 1. Draw Beautiful Glossy Wood Basket / Glass Vibe Background
        drawBackground(ctx);

        // 2. Aiming Guideline and preview drop
        if (!cooldown) {
          const config = FRUITS[currentFruitIdx];
          const margin = 15;
          const previewX = Math.max(margin + config.radius, Math.min(width - margin - config.radius, aimX));

          // Aiming dotted path
          ctx.strokeStyle = 'rgba(20, 184, 166, 0.45)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(previewX, warningY - 20);
          ctx.lineTo(previewX, height - 12);
          ctx.stroke();
          ctx.setLineDash([]); // Reset line dash

          // Aim preview fruit floating nicely
          const pulse = Math.sin(Date.now() / 150) * 2;
          drawFruitDisk(ctx, previewX, warningY - 45 + pulse, config, 1.0, 1.0, 0, 'happy', 0);
        }

        // Draw danger warning marker threshold
        ctx.strokeStyle = dangerAlert ? 'rgba(239, 68, 68, 0.7)' : 'rgba(226, 232, 240, 0.25)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(10, warningY);
        ctx.lineTo(width - 10, warningY);
        ctx.stroke();
        ctx.setLineDash([]); // Reset

        if (dangerAlert) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
          ctx.fillRect(10, warningY, width - 20, height - warningY - 12);

          // Danger Warning alert caption
          ctx.fillStyle = '#ef4444';
          ctx.font = 'black 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ BASKET OVERFLOW INCOMING! ⚡', width / 2, warningY - 10);
        }

        // 3. Render and animate rigid bodies fruits
        const bodies = Matter.Composite.allBodies(fruitsGroup);
        let aFruitAboveWarning = false;

        bodies.forEach((body) => {
          const meta = fruitsMetadata.current.get(body.id);
          if (!meta) return;

          const config = FRUITS[meta.fruitId];

          // Settle, rest and expression updates
          const isAtRest = Math.abs(body.velocity.x) < 0.08 && Math.abs(body.velocity.y) < 0.08;
          if (isAtRest) {
            meta.sleepTimer += 16.6; // approx ms
            if (meta.sleepTimer > 4000) {
              meta.expression = 'sleeping';
            } else {
              meta.expression = 'happy';
            }
          } else {
            meta.sleepTimer = 0;
            if (body.velocity.y > 1.8) {
              meta.expression = 'excited'; // drop or collision alert
            } else {
              meta.expression = 'default';
            }
          }

          // Intercept warning line height
          if (body.position.y - config.radius < warningY) {
            aFruitAboveWarning = true;
            meta.expression = 'scared';
          }

          // Animate squish back to normal scale
          meta.squishX += (1.0 - meta.squishX) * 0.12;
          meta.squishY += (1.0 - meta.squishY) * 0.12;

          // Blink logic
          if (!meta.isBlinking && Date.now() - meta.lastBlink > 3000 + Math.random() * 4000) {
            meta.isBlinking = true;
            meta.lastBlink = Date.now();
          }
          if (meta.isBlinking && Date.now() - meta.lastBlink > meta.blinkDuration) {
            meta.isBlinking = false;
          }

          // Draw the standard physics body
          drawFruitDisk(
            ctx,
            body.position.x,
            body.position.y,
            config,
            meta.squishX,
            meta.squishY,
            body.angle,
            meta.expression,
            meta.isBlinking ? 1 : 0
          );
        });

        // Trigger danger warning alerts after stabilization
        if (aFruitAboveWarning && bodies.length > 3) {
          if (!dangerAlert) {
            setDangerAlert(true);
            triggerDangerCountdown();
          }
        } else {
          if (dangerAlert) {
            setDangerAlert(false);
          }
        }

        // 4. Render juicy particles
        updateAndRenderParticles(ctx);

        // 5. Render floating text strings
        updateAndRenderFloatingText(ctx);

        // 6. Handle simulated opponents in Royale
        if (mode === 'royale') {
          simulateOpponentsTick();
        }
      }

      animationFrameId.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameState, currentFruitIdx, nextFruitIdx, mode, cooldown, dangerAlert]);

  // Handle danger top-out countdown
  const dangerTimeoutRef = useRef<any>(null);
  const triggerDangerCountdown = () => {
    if (dangerTimeoutRef.current) clearTimeout(dangerTimeoutRef.current);
    
    // Play subtle audio warnings
    const soundInterval = setInterval(() => {
      if (dangerAlert) synths.playDangerTick();
    }, 600);

    dangerTimeoutRef.current = setTimeout(() => {
      clearInterval(soundInterval);
      // Confirm if STILL in danger before triggering Game Over!
      if (dangerAlert) {
        synths.playGameOverSound();
        onGameOver();
      }
    }, 4000); // 4 seconds to solve the overflow!
  };

  // Clean-up timeouts
  useEffect(() => {
    return () => {
      if (dangerTimeoutRef.current) clearTimeout(dangerTimeoutRef.current);
    };
  }, []);

  // Opponents Score and Overflow Simulation (Pure client side, performance light)
  const simulateOpponentsTick = () => {
    const list = [...opponentsRef.current];
    let listChanged = false;
    const now = Date.now();

    list.forEach((opp) => {
      if (opp.status === 'dead') return;

      // Decrement simulated action cooldown
      opp.dropCooldown = Math.max(0, opp.dropCooldown - 16.6);

      // Drops simulated fruits periodically (every 1.5 to 3 seconds depends on skill level)
      if (opp.dropCooldown <= 0) {
        opp.dropCooldown = (1500 + Math.random() * 2000) / opp.skill;
        listChanged = true;

        // Choose a random simulated product
        const fLevel = Math.floor(Math.random() * 4);
        const fConfig = FRUITS[fLevel];

        // Increment simulated score
        opp.score += Math.round(fConfig.scoreValue * opp.skill);

        // Add dummy fruit vectors to its mini board layout
        const mockFruit = {
          x: 40 + Math.random() * 340,
          y: 500 - opp.fruitCount * 28 + (Math.random() - 0.5) * 15,
          r: fConfig.radius,
          color: fConfig.color,
        };

        if (opp.gridFruits.length < 14) {
          opp.gridFruits.push(mockFruit);
          opp.fruitCount = opp.gridFruits.length;
        }

        // Increase container heap
        opp.topLineFactor += 0.08 - 0.01 * opp.skill;

        // Occasional simulated matching merge reduces heap height
        if (Math.random() > 0.45 && opp.gridFruits.length > 2) {
          // Trigger a simulated merge pop!
          opp.topLineFactor = Math.max(0, opp.topLineFactor - 0.18 * opp.skill);
          opp.score += Math.round(18 * opp.skill);

          const removeCount = Math.floor(1 + Math.random() * 2);
          opp.gridFruits.splice(0, removeCount);
          opp.fruitCount = opp.gridFruits.length;
        }

        // Check if opponent overloads and dies
        if (opp.topLineFactor >= 1.0) {
          opp.status = 'dead';
          opp.topLineFactor = 0;
          opp.gridFruits = [];
          synths.playDangerTick(); // small shake sound
        }
      }
    });

    if (listChanged) {
      opponentsRef.current = list;
      if (onOpponentsUpdate) {
        onOpponentsUpdate([...list]);
      }
    }
  };

  // Particle Engine Tick
  const updateAndRenderParticles = (ctx: CanvasRenderingContext2D) => {
    const list = particlesRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life++;

      // Physics integration
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // slow gravity gravity
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      // Render
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      // Draw standard cute particles conforming to circle shapes
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();

      if (p.life >= p.maxLife) {
        list.splice(i, 1);
      }
    }
    ctx.globalAlpha = 1.0; // Reset
  };

  // Floating text Tick
  const updateAndRenderFloatingText = (ctx: CanvasRenderingContext2D) => {
    const list = floatingTextsRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i];
      t.life++;

      t.y += t.vy;
      t.vy *= 0.98; // decelerate upward speed
      t.alpha = Math.max(0, 1 - t.life / 50);

      ctx.fillStyle = t.color;
      ctx.globalAlpha = t.alpha;
      ctx.font = 'black 14px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      
      // Draw outline for arcade pop
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);

      if (t.life >= 50) {
        list.splice(i, 1);
      }
    }
    ctx.globalAlpha = 1.0; // Reset
  };

  // Draw the full glossy cabinet background
  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    // Beautiful Frosted Glass canvas backdrop
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'; // translucent container background
    ctx.fillRect(10, 10, width - 20, height - 20);

    // Grid lines for premium glass pane grid backdrop
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    const gridSpacing = 30;
    
    // Vertical grid
    for (let x = 10; x < width - 10; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, height - 12);
      ctx.stroke();
    }
    // Horizontal grid
    for (let y = 10; y < height - 10; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
    }

    // Outer decorative basket shadow (gorgeous polished white glass border)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(7, 7, width - 14, height - 14);
  };

  // Render highly advanced cute expressional cartoon fruits
  const drawFruitDisk = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    config: FruitConfig,
    squishX: number,
    squishY: number,
    angle: number,
    expression: 'happy' | 'scared' | 'excited' | 'sleeping' | 'default' | 'surprised',
    isBlinking: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(squishX, squishY);

    const r = config.radius;

    // 1. Core Sphere Base Fill
    const gradient = ctx.createRadialGradient(-r / 3, -r / 3, r / 8, 0, 0, r);
    gradient.addColorStop(0, config.gradientColors[0]);
    gradient.addColorStop(0.8, config.gradientColors[1]);
    gradient.addColorStop(1, '#00000030'); // slight depth shadow edge

    ctx.fillStyle = gradient;

    ctx.beginPath();
    
    // Draw customized cartoon profiles depending on shapeType
    if (config.shapeType === 'strawberry') {
      // Draw cute heart triangular shape
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r * 0.9, -r * 1.0, r * 1.1, r * 0.2, 0, r * 1.1);
      ctx.bezierCurveTo(-r * 1.1, r * 0.2, -r * 0.9, -r * 1.0, 0, -r);
      ctx.fill();

      // Seed details
      ctx.fillStyle = '#fef08a'; // yellow seeds
      const seedOffsets = [
        { sx: -r/3, sy: -r/3 }, { sx: r/3, sy: -r/3 },
        { sx: -r/2, sy: r/6 }, { sx: 0, sy: r/6 }, { sx: r/2, sy: r/6 },
        { sx: -r/4, sy: r/1.6 }, { sx: r/4, sy: r/1.6 }
      ];
      seedOffsets.forEach(pos => {
        ctx.beginPath();
        ctx.arc(pos.sx, pos.sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Leaf crown representation on top
      ctx.fillStyle = '#22c55e'; // green crown
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.85);
      ctx.lineTo(0, -r * 1.25);
      ctx.lineTo(r * 0.6, -r * 0.85);
      ctx.lineTo(r * 0.25, -r * 0.7);
      ctx.lineTo(0, -r * 0.9);
      ctx.lineTo(-r * 0.25, -r * 0.7);
      ctx.closePath();
      ctx.fill();
    } 
    else if (config.shapeType === 'banana') {
      // Draw crescent banana shape
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.1);
      ctx.quadraticCurveTo(0, r * 0.7, r * 0.9, -r * 0.1);
      ctx.quadraticCurveTo(0, r * 0.2, -r * 0.9, -r * 0.1);
      ctx.fill();

      // Banana ends
      ctx.fillStyle = '#854d0e'; // brown ends
      ctx.beginPath();
      ctx.arc(-r * 0.9, -r * 0.1, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.9, -r * 0.1, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } 
    else if (config.shapeType === 'pineapple') {
      // Draw hexagonal rounded brick oval base
      ctx.moveTo(0, -r * 0.8);
      ctx.lineTo(r * 0.6, -r * 0.4);
      ctx.lineTo(r * 0.6, r * 0.4);
      ctx.lineTo(0, r * 0.9);
      ctx.lineTo(-r * 0.6, r * 0.4);
      ctx.lineTo(-r * 0.6, -r * 0.4);
      ctx.closePath();
      ctx.fill();

      // Pineapple crosshatch diamond lines
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.2); ctx.lineTo(r * 0.5, r * 0.6);
      ctx.moveTo(-r * 0.5, r * 0.2); ctx.lineTo(r * 0.5, -r * 0.6);
      ctx.stroke();

      // Leaf spike array on top
      ctx.fillStyle = '#15803d'; // dark green crown
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.82);
      ctx.lineTo(-r * 0.4, -r * 1.35);
      ctx.lineTo(-r * 0.1, -r * 0.95);
      ctx.lineTo(0, -r * 1.5);
      ctx.lineTo(r * 0.1, -r * 0.95);
      ctx.lineTo(r * 0.4, -r * 1.35);
      ctx.lineTo(0, -r * 0.82);
      ctx.fill();
    } 
    else if (config.shapeType === 'apple') {
      // Red Apple with a slight bottom indentation & stem
      ctx.arc(0, -r * 0.1, r * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Leaf stem
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.85);
      ctx.quadraticCurveTo(r * 0.2, -r * 1.15, r * 0.35, -r * 1.15);
      ctx.stroke();

      // Green Leaf
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(r * 0.25, -r * 1.15, r * 0.15, r * 0.08, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    } 
    else {
      // Standard perfectly round physical sphere
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Add Glossy Shine Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-r / 3, -r / 3, r / 4, r / 8, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Render Cute Animating Faces (detailed expressions, blush)
    // Scale faces proportionally with radii
    const eyeOffset = r * 0.35;
    const eyeY = -r * 0.15;
    const eyeRad = Math.max(2, r * 0.11);
    const scaleFactor = r / 100; // factor for strokes

    // 🌸 Cute blushing cheeks
    ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-eyeOffset * 1.25, eyeY + eyeRad * 1.5, eyeRad * 1.6, eyeRad * 0.8, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeOffset * 1.25, eyeY + eyeRad * 1.5, eyeRad * 1.6, eyeRad * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw Eyes
    ctx.fillStyle = '#0f172a'; // Deep obsidian-slate eyes
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(1.5, scaleFactor * 14);
    ctx.lineCap = 'round';

    if (isBlinking) {
      // Drawn as flat lines for blinks
      ctx.beginPath();
      ctx.moveTo(-eyeOffset - eyeRad, eyeY);
      ctx.lineTo(-eyeOffset + eyeRad, eyeY);
      ctx.moveTo(eyeOffset - eyeRad, eyeY);
      ctx.lineTo(eyeOffset + eyeRad, eyeY);
      ctx.stroke();
    } 
    else if (expression === 'scared') {
      // Dizzy swirling panic or "X_X"
      ctx.beginPath();
      // Left eye X
      ctx.moveTo(-eyeOffset - eyeRad, eyeY - eyeRad);
      ctx.lineTo(-eyeOffset + eyeRad, eyeY + eyeRad);
      ctx.moveTo(-eyeOffset + eyeRad, eyeY - eyeRad);
      ctx.lineTo(-eyeOffset - eyeRad, eyeY + eyeRad);
      // Right eye X
      ctx.moveTo(eyeOffset - eyeRad, eyeY - eyeRad);
      ctx.lineTo(eyeOffset + eyeRad, eyeY + eyeRad);
      ctx.moveTo(eyeOffset + eyeRad, eyeY - eyeRad);
      ctx.lineTo(eyeOffset - eyeRad, eyeY + eyeRad);
      ctx.stroke();
    } 
    else if (expression === 'excited') {
      // Starry eyed "♥_♥" or big circles with stars
      ctx.fillStyle = '#f43f5e'; // blushing hearts eyes
      
      // Draw simple heart icon as eyes
      const drawHeartEye = (hx: number, hy: number) => {
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.bezierCurveTo(hx - eyeRad * 0.8, hy - eyeRad * 1.1, hx - eyeRad * 1.5, hy + eyeRad * 0.4, hx, hy + eyeRad * 1.2);
        ctx.bezierCurveTo(hx + eyeRad * 1.5, hy + eyeRad * 0.4, hx + eyeRad * 0.8, hy - eyeRad * 1.1, hx, hy);
        ctx.fill();
      };
      drawHeartEye(-eyeOffset, eyeY);
      drawHeartEye(eyeOffset, eyeY);
    } 
    else if (expression === 'sleeping') {
      // Peaceful closed arcs "u_u" or tiny sleepy eyes
      ctx.beginPath();
      ctx.arc(-eyeOffset, eyeY, eyeRad, 0, Math.PI, false);
      ctx.moveTo(eyeOffset + eyeRad, eyeY);
      ctx.arc(eyeOffset, eyeY, eyeRad, 0, Math.PI, false);
      ctx.stroke();
    } 
    else {
      // Default cute round glossy eyes
      ctx.beginPath();
      ctx.arc(-eyeOffset, eyeY, eyeRad, 0, Math.PI * 2);
      ctx.arc(eyeOffset, eyeY, eyeRad, 0, Math.PI * 2);
      ctx.fill();

      // Shiny reflections inside pupils
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-eyeOffset - eyeRad * 0.3, eyeY - eyeRad * 0.3, eyeRad * 0.35, 0, Math.PI * 2);
      ctx.arc(eyeOffset - eyeRad * 0.3, eyeY - eyeRad * 0.3, eyeRad * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Draw Cute Mouth
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#ef4444'; // Red tongue inside open mouths
    ctx.lineWidth = Math.max(1.8, scaleFactor * 16);

    const mouthY = eyeY + eyeRad * 1.8;

    if (expression === 'excited' || expression === 'surprised') {
      // Adorable wide open gasping sound circle "O"
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.arc(0, mouthY, eyeRad * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } 
    else if (expression === 'sleeping') {
      // Tiny "o" whistle mouth for cute snoring effect
      ctx.beginPath();
      ctx.arc(0, mouthY, eyeRad * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      // Render floaty 'Z' particles on random cycles
      if (Math.random() > 0.98) {
        // We'll create zZZ texts outside, but we can draw a tiny bubble decoration here
      }
    } 
    else if (expression === 'scared') {
      // Curly squiggly worry mouth
      ctx.beginPath();
      ctx.moveTo(-eyeRad, mouthY);
      ctx.quadraticCurveTo(-eyeRad * 0.5, mouthY - eyeRad * 0.4, 0, mouthY);
      ctx.quadraticCurveTo(eyeRad * 0.5, mouthY + eyeRad * 0.4, eyeRad, mouthY);
      ctx.stroke();
    } 
    else {
      // Default heartwarming smile!
      ctx.beginPath();
      ctx.arc(0, mouthY - eyeRad * 0.3, eyeRad * 0.9, 0, Math.PI, false);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Drag interaction to align drop selector
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const clientX = e.clientX - rect.left;
      setAimX(clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const clientX = e.touches[0].clientX - rect.left;
        setAimX(clientX);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      id="game-canvas-wrapper"
      className="relative flex flex-col items-center justify-center p-3 glass rounded-3xl flex-1 w-full"
    >
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={toggleSound}
          id="toggle-sound-btn"
          className="p-2 w-10 h-10 flex items-center justify-center rounded-full bg-white/30 border border-white/40 hover:bg-white/50 text-slate-800 shadow-md transition-all cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-pink-600" /> : <Volume2 className="w-5 h-5 text-pink-700" />}
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onClick={handleDropFruit}
        id="interactive-fruit-canvas"
        className="block bg-white/20 backdrop-blur-md rounded-2xl cursor-crosshair border border-white/55 shadow-2xl w-full max-w-[450px]"
        style={{ touchAction: 'none' }}
      />

      {/* Aiming Assist Prompt HUD */}
      <div className="mt-3 flex items-center justify-between w-full max-w-[450px] px-2 text-xs text-slate-750 font-semibold select-none">
        <span className="flex items-center gap-1">
          <ShieldAlert className="w-4 h-4 text-pink-600" />
          <span>Tap / Slide anywhere on basket to drop!</span>
        </span>
        <span className="font-mono text-[11px] font-bold text-pink-750">
          Rank: #{playerRank}
        </span>
      </div>
    </div>
  );
};
