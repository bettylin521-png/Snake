/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Pause, Gamepad2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

// 遊戲常數設定
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 25; // 網格大小
const INITIAL_SPEED = 120; // 初始速度 (ms)
const SPEED_INCREMENT = 0.5; // 每吃一個食物增加的速度
const MIN_SPEED = 60; // 最高速度限制

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export default function App() {
  // 遊戲狀態
  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('UP');
  const [nextDirection, setNextDirection] = useState<Direction>('UP');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // 隨機生成食物位置
  const generateFood = useCallback((currentSnake: Point[]): Point => {
    const cols = CANVAS_WIDTH / GRID_SIZE;
    const rows = CANVAS_HEIGHT / GRID_SIZE;
    let newFood: Point;
    
    // 確保食物不會生成在蛇身上
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows),
      };
      const isOnSnake = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  // 重置遊戲
  const resetGame = () => {
    setSnake([
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ]);
    setFood({ x: 5, y: 5 });
    setDirection('UP');
    setNextDirection('UP');
    setIsGameOver(false);
    setIsPaused(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setHasStarted(true);
  };

  // 處理方向改變
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        if (direction !== 'DOWN') setNextDirection('UP');
        break;
      case 'ArrowDown':
        if (direction !== 'UP') setNextDirection('DOWN');
        break;
      case 'ArrowLeft':
        if (direction !== 'RIGHT') setNextDirection('LEFT');
        break;
      case 'ArrowRight':
        if (direction !== 'LEFT') setNextDirection('RIGHT');
        break;
      case ' ': // 空白鍵暫停
        if (hasStarted && !isGameOver) setIsPaused((prev) => !prev);
        break;
    }
  }, [direction, hasStarted, isGameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 遊戲邏輯更新
  const update = useCallback(() => {
    if (isGameOver || isPaused || !hasStarted) return;

    setDirection(nextDirection);
    
    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = { ...head };

      // 根據方向移動頭部
      if (nextDirection === 'UP') newHead.y -= 1;
      if (nextDirection === 'DOWN') newHead.y += 1;
      if (nextDirection === 'LEFT') newHead.x -= 1;
      if (nextDirection === 'RIGHT') newHead.x += 1;

      // 碰撞檢測：牆壁
      const cols = CANVAS_WIDTH / GRID_SIZE;
      const rows = CANVAS_HEIGHT / GRID_SIZE;
      if (
        newHead.x < 0 ||
        newHead.x >= cols ||
        newHead.y < 0 ||
        newHead.y >= rows
      ) {
        setIsGameOver(true);
        return prevSnake;
      }

      // 碰撞檢測：自己
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // 吃到食物
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => {
          const newScore = s + 10;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
        setFood(generateFood(newSnake));
        setSpeed((prev) => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
      } else {
        // 沒吃到食物，移除尾部
        newSnake.pop();
      }

      return newSnake;
    });
  }, [nextDirection, isGameOver, isPaused, hasStarted, food, generateFood, highScore]);

  // 繪製邏輯
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除畫布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 繪製格線 (選用，增加質感)
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= CANVAS_WIDTH; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i <= CANVAS_HEIGHT; i += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_WIDTH, i);
      ctx.stroke();
    }

    // 繪製食物
    ctx.fillStyle = '#ef4444'; // 紅色
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(
      food.x * GRID_SIZE + 2,
      food.y * GRID_SIZE + 2,
      GRID_SIZE - 4,
      GRID_SIZE - 4,
      8
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // 繪製蛇
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? '#10b981' : '#34d399'; // 頭深綠，身體淺綠
      
      ctx.beginPath();
      const padding = isHead ? 0 : 2;
      ctx.roundRect(
        segment.x * GRID_SIZE + padding,
        segment.y * GRID_SIZE + padding,
        GRID_SIZE - (padding * 2),
        GRID_SIZE - (padding * 2),
        isHead ? 6 : 4
      );
      ctx.fill();

      // 蛇頭眼睛
      if (isHead) {
        ctx.fillStyle = 'white';
        const eyeSize = 4;
        let leftEye = { x: 0, y: 0 };
        let rightEye = { x: 0, y: 0 };

        if (direction === 'UP' || direction === 'DOWN') {
          leftEye = { x: segment.x * GRID_SIZE + 6, y: segment.y * GRID_SIZE + (direction === 'UP' ? 6 : 15) };
          rightEye = { x: segment.x * GRID_SIZE + 15, y: segment.y * GRID_SIZE + (direction === 'UP' ? 6 : 15) };
        } else {
          leftEye = { x: segment.x * GRID_SIZE + (direction === 'LEFT' ? 6 : 15), y: segment.y * GRID_SIZE + 6 };
          rightEye = { x: segment.x * GRID_SIZE + (direction === 'LEFT' ? 6 : 15), y: segment.y * GRID_SIZE + 15 };
        }
        ctx.beginPath();
        ctx.arc(leftEye.x, leftEye.y, 2, 0, Math.PI * 2);
        ctx.arc(rightEye.x, rightEye.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [snake, food, direction]);

  // 遊戲迴圈
  const gameLoop = useCallback((timestamp: number) => {
    if (!lastUpdateTimeRef.current) lastUpdateTimeRef.current = timestamp;
    const elapsed = timestamp - lastUpdateTimeRef.current;

    if (elapsed >= speed) {
      update();
      lastUpdateTimeRef.current = timestamp;
    }

    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [speed, update, draw]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameLoop]);

  return (
    <div id="game-container" className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[800px] flex flex-col gap-6"
      >
        {/* Header / Stats */}
        <div className="flex items-center justify-between bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Gamepad2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">經典貪食蛇</h1>
              <p className="text-slate-400 text-sm">經典復刻版本</p>
            </div>
          </div>
          
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">目前分數</p>
              <p className="text-2xl font-mono text-emerald-400">{score.toString().padStart(4, '0')}</p>
            </div>
            <div className="text-right border-l border-slate-700 pl-6">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">最高紀錄</p>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <p className="text-2xl font-mono text-amber-400">{highScore.toString().padStart(4, '0')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Game Canvas Board */}
        <div className="relative group">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="bg-slate-50 rounded-2xl shadow-2xl border-4 border-slate-800 w-full aspect-[4/3] object-contain cursor-none"
          />

          {/* Overlays */}
          <AnimatePresence>
            {!hasStarted && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl"
                >
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                    <Play className="w-10 h-10 text-slate-900 fill-current ml-1" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">準備好了嗎？</h2>
                  <p className="text-slate-400 mb-8 max-w-xs">
                    使用方向鍵控制蛇的移動，吃掉紅色蘋果來獲得分數並成長。
                  </p>
                  <button 
                    onClick={resetGame}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                  >
                    開始遊戲
                  </button>
                </motion.div>
              </motion.div>
            )}

            {isGameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-rose-900/40 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-slate-900 p-10 rounded-3xl border-2 border-rose-500/30 shadow-2xl"
                >
                  <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <RotateCcw className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-4xl font-black mb-2 text-white">遊戲結束</h2>
                  <p className="text-rose-100/60 mb-6 font-mono text-xl">最終得分：{score}</p>
                  <button 
                    onClick={resetGame}
                    className="px-12 py-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2 mx-auto"
                  >
                    再玩一次
                  </button>
                </motion.div>
              </motion.div>
            )}

            {isPaused && !isGameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-slate-900/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center animate-pulse">
                    <Pause className="w-8 h-8 text-slate-900 fill-current" />
                  </div>
                  <p className="text-2xl font-bold">遊戲暫停</p>
                  <button 
                    onClick={() => setIsPaused(false)}
                    className="mt-4 px-8 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium"
                  >
                    按空白鍵或此處繼續
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls Hint */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex items-center gap-8">
            <div className="grid grid-cols-3 gap-2">
              <div />
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center border-b-2 border-slate-950"><ArrowUp className="w-5 h-5" /></div>
              <div />
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center border-b-2 border-slate-950"><ArrowLeft className="w-5 h-5" /></div>
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center border-b-2 border-slate-950"><ArrowDown className="w-5 h-5" /></div>
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center border-b-2 border-slate-950"><ArrowRight className="w-5 h-5" /></div>
            </div>
            <div>
              <p className="font-bold text-slate-200">操作方式</p>
              <p className="text-sm text-slate-400">使用鍵盤方向鍵來引導方向</p>
            </div>
          </div>
          
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex items-center gap-6">
            <div className="w-24 h-10 bg-slate-700 rounded-lg flex items-center justify-center border-b-2 border-slate-950 text-xs font-mono">SPACE</div>
            <div>
              <p className="font-bold text-slate-200">暫停遊戲</p>
              <p className="text-sm text-slate-400">按空白鍵可隨時暫停</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
