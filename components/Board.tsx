import React from 'react';
import { Player } from '../types';
import { BOARD_SIZE } from '../constants';
import { Wind, Snowflake, Hammer, RotateCw, History, RotateCcw, Target } from 'lucide-react';

interface BoardProps {
  board: number[][];
  currentPlayer: Player;
  onCellClick: (row: number, col: number) => void;
  lastMove: { row: number, col: number } | null;
  winningLine: { row: number, col: number }[] | null;
  disabled: boolean;
  activeSkillAnimation: string | null;
  pendingSkill?: string | null;
}

const Board: React.FC<BoardProps> = ({ 
  board, 
  currentPlayer,
  onCellClick, 
  lastMove, 
  winningLine, 
  disabled,
  activeSkillAnimation,
  pendingSkill
}) => {
  // Helper to identify "star points" (Hoshi) on a 15x15 board
  const isStarPoint = (r: number, c: number) => {
    const points = [3, 7, 11];
    return points.includes(r) && points.includes(c);
  };

  // Determine board animation class based on skill
  const getBoardAnimationClass = () => {
    if (activeSkillAnimation === 'liba') return 'animate-shake';
    if (activeSkillAnimation === 'liangji') return 'animate-spin-fast';
    return '';
  };

  return (
    <div className={`relative p-2 bg-wood-700 rounded-lg shadow-2xl border-4 border-wood-900 inline-block ${getBoardAnimationClass()}`}>
      
      {/* Pending Skill Overlay Text */}
      {pendingSkill === 'feisha' && (
          <div className="absolute -top-12 left-0 right-0 text-center animate-bounce">
              <span className="bg-red-600 text-white px-4 py-1 rounded-full font-bold shadow-lg border-2 border-white">
                  请点击移除一颗对手棋子
              </span>
          </div>
      )}

      {/* Overlays for Skills */}
      {activeSkillAnimation === 'feisha' && (
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden rounded-lg flex items-center justify-center">
           <div className="animate-wind-swipe absolute w-full h-64 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 blur-md" />
           <div className="animate-wind-swipe absolute w-full h-32 top-1/4 bg-gradient-to-r from-transparent via-stone-300/50 to-transparent skew-x-12 blur-sm delay-75" />
           <Wind className="animate-wind-swipe text-stone-700 absolute w-32 h-32 opacity-80" />
        </div>
      )}

      {activeSkillAnimation === 'jingru' && (
        <div className="absolute inset-0 z-30 pointer-events-none rounded-lg bg-blue-200/30 animate-freeze flex items-center justify-center backdrop-blur-[1px]">
           <Snowflake className="text-blue-500 w-48 h-48 animate-pulse drop-shadow-lg" />
        </div>
      )}

      {activeSkillAnimation === 'liba' && (
        <div className="absolute inset-0 z-30 pointer-events-none rounded-lg flex items-center justify-center">
           <div className="animate-smash">
              <Hammer className="text-amber-900 w-64 h-64 drop-shadow-2xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-yellow-500/30 rounded-full animate-ping" />
           </div>
        </div>
      )}
      
      {activeSkillAnimation === 'dongshan' && (
        <div className="absolute inset-0 z-30 pointer-events-none rounded-lg bg-amber-100/30 flex items-center justify-center animate-fade-in-up">
           <History className="text-amber-600 w-40 h-40 animate-spin-slow drop-shadow-lg" />
           <div className="absolute inset-0 bg-gradient-to-t from-yellow-200/20 to-transparent" />
        </div>
      )}

       {activeSkillAnimation === 'liangji' && (
        <div className="absolute inset-0 z-30 pointer-events-none rounded-lg flex items-center justify-center">
           <RotateCw className="text-purple-600 w-48 h-48 animate-spin-fast opacity-50" />
        </div>
      )}

      {activeSkillAnimation === 'shiguang' && (
        <div className="absolute inset-0 z-30 pointer-events-none rounded-lg flex items-center justify-center">
           <div className="animate-spin-reverse">
               <RotateCcw className="text-cyan-600 w-48 h-48 opacity-60" />
           </div>
           <div className="absolute inset-0 bg-cyan-100/20 mix-blend-overlay" />
        </div>
      )}


      <div 
        className="grid bg-wood-300 border border-black transition-colors duration-500"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
          width: 'min(90vw, 450px)', // Reduced size
          height: 'min(90vw, 450px)', // Reduced size
        }}
      >
        {board.map((row, rowIndex) => (
          row.map((cell, colIndex) => {
            const isLast = lastMove?.row === rowIndex && lastMove?.col === colIndex;
            const isWin = winningLine?.some(p => p.row === rowIndex && p.col === colIndex);
            
            // Determine if interactable during skill targeting
            // Target is valid if: Skill is Feisha AND Cell is NOT empty AND Cell is NOT current player (i.e. is Opponent)
            const isOpponentPiece = cell !== Player.None && cell !== currentPlayer;
            const isTargetable = pendingSkill === 'feisha' && isOpponentPiece;
            const targetClass = isTargetable ? 'ring-2 ring-red-500/70 animate-pulse cursor-crosshair' : '';

            // Standard interactivity
            const isClickable = !disabled || (pendingSkill && isTargetable);

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => isClickable && onCellClick(rowIndex, colIndex)}
                className={`
                  relative border-[0.5px] border-black/30 flex items-center justify-center
                  ${disabled && !pendingSkill ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-black/5'}
                `}
              >
                {/* Star Points */}
                {isStarPoint(rowIndex, colIndex) && (
                  <div className="absolute w-2 h-2 bg-black rounded-full z-0" />
                )}

                {/* Stones */}
                {cell !== Player.None && (
                  <div
                    className={`
                      w-[85%] h-[85%] rounded-full shadow-md z-10
                      transition-all duration-300
                      ${cell === Player.Black 
                        ? 'bg-gradient-to-br from-gray-800 to-black' 
                        : 'bg-gradient-to-br from-white to-gray-200 border border-gray-300'}
                      ${isLast ? 'ring-2 ring-red-500 ring-offset-1' : ''}
                      ${isWin ? 'ring-4 ring-green-500 ring-offset-2 animate-pulse' : ''}
                      ${targetClass}
                    `}
                  >
                     {isLast && (
                        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${cell === Player.Black ? 'bg-white/50' : 'bg-black/20'}`} />
                     )}
                     
                     {isTargetable && (
                         <div className="absolute inset-0 flex items-center justify-center text-red-500/80">
                             <Target size={12} strokeWidth={3} />
                         </div>
                     )}
                  </div>
                )}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
};

export default Board;