import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player, GameMode, AIDifficulty, PlayerState, MoveResult } from './types';
import { BOARD_SIZE, MAX_SKILL_POINTS, WIN_CONDITION, AI_PERSONAS, AVAILABLE_SKILLS } from './constants';
import Board from './components/Board';
import SkillPanel from './components/SkillPanel';
import { getAIMove } from './services/geminiService';
import { Trophy, RefreshCw, Play, User, Cpu, RotateCcw } from 'lucide-react';

// Initial State
const createEmptyBoard = () => Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
const initialPlayerState: PlayerState = { skillPoints: 0, usedSkills: [], isDoubleMoveActive: false };

const App: React.FC = () => {
  // Game Configuration
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>(AIDifficulty.Easy);
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  // Game State
  const [board, setBoard] = useState<number[][]>(createEmptyBoard());
  const [history, setHistory] = useState<number[][][]>([]); // For Logic & Feisha Skill
  const [currentPlayer, setCurrentPlayer] = useState<Player>(Player.Black);
  const [winner, setWinner] = useState<Player | null>(null);
  const [winningLine, setWinningLine] = useState<{row: number, col: number}[] | null>(null);
  const [lastMove, setLastMove] = useState<{row: number, col: number} | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [activeSkillAnimation, setActiveSkillAnimation] = useState<string | null>(null);

  // Skill Mechanics State
  const [pendingSkill, setPendingSkill] = useState<string | null>(null); // For skills requiring target selection
  const [wipedBoard, setWipedBoard] = useState<number[][] | null>(null); // For "Dongshan"
  const [lastWiper, setLastWiper] = useState<Player | null>(null); // Who used Liba?
  const [extraTurn, setExtraTurn] = useState<boolean>(false); // For "Jingru"
  const [hasUsedSkillThisTurn, setHasUsedSkillThisTurn] = useState<boolean>(false); // 1 skill per turn limit

  // Player Stats (SP, Skills)
  const [blackState, setBlackState] = useState<PlayerState>(initialPlayerState);
  const [whiteState, setWhiteState] = useState<PlayerState>(initialPlayerState);

  // Refs for anti-infinite loop logic
  const turnInProgress = useRef(false);

  const resetGame = () => {
    const empty = createEmptyBoard();
    setBoard(empty);
    setHistory([empty]); // Initial history
    setCurrentPlayer(Player.Black);
    setWinner(null);
    setWinningLine(null);
    setLastMove(null);
    setBlackState({ ...initialPlayerState });
    setWhiteState({ ...initialPlayerState });
    setAiReasoning(null);
    setWipedBoard(null);
    setLastWiper(null);
    setExtraTurn(false);
    setHasUsedSkillThisTurn(false);
    turnInProgress.current = false;
    setIsThinking(false);
    setActiveSkillAnimation(null);
    setPendingSkill(null);
  };

  const startGame = (mode: GameMode, diff?: AIDifficulty) => {
    setGameMode(mode);
    if (diff) setAiDifficulty(diff);
    setIsMenuOpen(false);
    resetGame();
  };

  // Win Detection
  const checkWin = useCallback((currentBoard: number[][], player: Player, row: number, col: number) => {
    const directions = [
      [0, 1],   // Horizontal
      [1, 0],   // Vertical
      [1, 1],   // Diagonal Down-Right
      [1, -1]   // Diagonal Down-Left
    ];

    for (const [dx, dy] of directions) {
      const line = [{row, col}];
      
      // Check forward
      let r = row + dx;
      let c = col + dy;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
        line.push({row: r, col: c});
        r += dx;
        c += dy;
      }
      
      // Check backward
      r = row - dx;
      c = col - dy;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
        line.push({row: r, col: c});
        r -= dx;
        c -= dy;
      }

      if (line.length >= WIN_CONDITION) {
        setWinningLine(line);
        setWinner(player);
        return true;
      }
    }
    return false;
  }, []);

  // Handle Move Logic
  const handleMove = async (row: number, col: number) => {
    if (winner || board[row][col] !== Player.None || turnInProgress.current || activeSkillAnimation || pendingSkill) return;

    turnInProgress.current = true;
    
    // 1. Place Stone
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);
    setLastMove({ row, col });
    
    // Add to History (Deep copy)
    setHistory(prev => [...prev, newBoard.map(r => [...r])]);

    // 2. Update Skill Points for the player who JUST moved
    const updateState = currentPlayer === Player.Black ? setBlackState : setWhiteState;
    
    updateState(prev => ({
      ...prev,
      skillPoints: Math.min(prev.skillPoints + 1, MAX_SKILL_POINTS)
    }));

    // 3. Check Win
    const hasWon = checkWin(newBoard, currentPlayer, row, col);

    if (!hasWon) {
      if (extraTurn) {
        // "Jingru" Effect: Turn stays with current player
        setExtraTurn(false);
        // Allow resetting skill restriction for the "extra" turn to make it powerful
        setHasUsedSkillThisTurn(false); 
        turnInProgress.current = false;
      } else {
        // Switch Turn
        setCurrentPlayer(prev => prev === Player.Black ? Player.White : Player.Black);
        setHasUsedSkillThisTurn(false); // Reset restriction for next player
        turnInProgress.current = false;
      }
    } else {
      turnInProgress.current = false;
    }
  };

  // AI Logic Effect
  useEffect(() => {
    if (
      gameMode === GameMode.PvE && 
      currentPlayer === Player.White && 
      !winner && 
      !isThinking &&
      !activeSkillAnimation &&
      !pendingSkill
    ) {
      const runAI = async () => {
        setIsThinking(true);
        // Small delay for UI realism
        await new Promise(resolve => setTimeout(resolve, 800)); 
        
        const result: MoveResult = await getAIMove(board, aiDifficulty, Player.White);
        
        setIsThinking(false);
        
        if (result.row !== -1) {
            setAiReasoning(result.analysis || null);
            handleMove(result.row, result.col);
        } else {
            console.warn("AI skipped move or error");
        }
      };
      runAI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, gameMode, winner, board, isThinking, activeSkillAnimation, pendingSkill]); 

  // Helper to find last move from board state difference
  const findLastMove = (current: number[][], previous: number[][]): {row: number, col: number} | null => {
      for(let r=0; r<BOARD_SIZE; r++) {
          for(let c=0; c<BOARD_SIZE; c++) {
              if (current[r][c] !== Player.None && previous[r][c] === Player.None) {
                  return { row: r, col: c };
              }
          }
      }
      return null;
  }

  // Skill Initiation
  const handleUseSkill = (skillId: string) => {
    if (hasUsedSkillThisTurn || activeSkillAnimation) return;

    // Toggle logic for target-based skills
    if (skillId === 'feisha') {
        if (pendingSkill === 'feisha') {
            setPendingSkill(null); // Cancel selection
        } else {
            setPendingSkill('feisha'); // Enter selection mode
        }
        return;
    }

    // Execute immediate skills
    executeSkillLogic(skillId);
  };

  // Core Skill Execution Logic
  const executeSkillLogic = (skillId: string, target?: {row: number, col: number}) => {
    const updateState = currentPlayer === Player.Black ? setBlackState : setWhiteState;
    const skill = AVAILABLE_SKILLS.find(s => s.id === skillId);
    
    if (!skill) return;

    // 1. Deduct cost & Mark used
    updateState(prev => ({
      ...prev,
      skillPoints: prev.skillPoints - skill.cost,
      // Add to usedSkills ONLY if it's NOT the Time Reversal skill (which has unlimited uses)
      usedSkills: skillId === 'shiguang' ? prev.usedSkills : [...prev.usedSkills, skillId]
    }));
    setHasUsedSkillThisTurn(true);
    setPendingSkill(null);

    // 2. Trigger Animation
    setActiveSkillAnimation(skillId);

    // 3. Wait for animation, then execute logic
    const animationDuration = 800; // Match CSS animations roughly

    setTimeout(() => {
        // --- SKILL LOGIC EXECUTION ---
        if (skillId === 'feisha' && target) {
            // "飞沙走石": Remove SPECIFIC opponent stone
            const newBoard = board.map(r => [...r]);
            newBoard[target.row][target.col] = Player.None;
            setBoard(newBoard);
            
            // Add state to history to preserve flow
            setHistory(prev => [...prev, newBoard.map(r => [...r])]);
            
            // If we removed the "last move" stone, clear the highlight
            if (lastMove && lastMove.row === target.row && lastMove.col === target.col) {
                setLastMove(null);
            }
        } 
        else if (skillId === 'shiguang') {
            // "时光倒流": Undo 2 moves
            if (history.length >= 3) {
                 const newHistory = [...history];
                 newHistory.pop(); // Pop Opponent's move
                 newHistory.pop(); // Pop My move
                 
                 const previousBoard = newHistory[newHistory.length - 1];
                 setBoard(previousBoard.map(r => [...r]));
                 setHistory(newHistory);
                 
                 // Restore last move indicator
                 if (newHistory.length > 1) {
                     const prev = newHistory[newHistory.length - 2];
                     const curr = newHistory[newHistory.length - 1];
                     setLastMove(findLastMove(curr, prev));
                 } else {
                     setLastMove(null);
                 }
            }
        }
        else if (skillId === 'jingru') {
            // "静如止水": Skip opponent turn.
            setExtraTurn(true);
        } 
        else if (skillId === 'liba') {
            // "力拔山兮": Clear board, enter opponent turn.
            setWipedBoard(board.map(row => [...row]));
            setLastWiper(currentPlayer);
            
            const empty = createEmptyBoard();
            setBoard(empty);
            setHistory([empty]); 
            setLastMove(null);
            
            // Switch Turn
            setCurrentPlayer(prev => prev === Player.Black ? Player.White : Player.Black);
            setHasUsedSkillThisTurn(false);
        } 
        else if (skillId === 'dongshan') {
            // "东山再起": Restore board from wipedBoard.
            if (wipedBoard) {
                const restored = wipedBoard.map(row => [...row]);
                setBoard(restored);
                setHistory(prev => [...prev, restored]);
                
                setWipedBoard(null);
                setLastWiper(null);
            }
        } 
        else if (skillId === 'liangji') {
            // "两极反转": Swap pieces, enter opponent turn.
            const newBoard = board.map(row => row.map(cell => {
                if (cell === Player.Black) return Player.White;
                if (cell === Player.White) return Player.Black;
                return Player.None;
            }));
            setBoard(newBoard);
            setHistory(prev => [...prev, newBoard]);
            
            // Switch Turn
            setCurrentPlayer(prev => prev === Player.Black ? Player.White : Player.Black);
            setHasUsedSkillThisTurn(false);
        }

        // Clear Animation State
        setActiveSkillAnimation(null);

    }, animationDuration);
  };

  // Intercept Board Clicks for Targeting
  const handleBoardClick = (row: number, col: number) => {
      // 1. Handling "Feisha" Targeting
      if (pendingSkill === 'feisha') {
          const targetPlayer = currentPlayer === Player.Black ? Player.White : Player.Black;
          // Valid Target: Opponent Stone
          if (board[row][col] === targetPlayer) {
              executeSkillLogic('feisha', {row, col});
          }
          return;
      }

      // 2. Normal Move
      handleMove(row, col);
  };

  // --- Renders ---

  if (isMenuOpen) {
    return (
      <div className="min-h-screen bg-wood-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-stone-50 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border-4 border-amber-700">
          <h1 className="text-5xl font-extrabold text-amber-900 mb-2">技能五子棋</h1>
          <p className="text-stone-600 mb-8 font-medium">传统五子棋与技能的完美结合</p>

          <div className="space-y-4">
            <button 
              onClick={() => startGame(GameMode.PvP)}
              className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
            >
              双人对战 (本地)
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-stone-50 text-gray-500">或者 挑战AI</span>
              </div>
            </div>

            {Object.entries(AI_PERSONAS).map(([key, persona]) => (
               <button
                 key={key}
                 onClick={() => startGame(GameMode.PvE, key as AIDifficulty)}
                 className="w-full py-3 bg-white border-2 border-amber-200 hover:bg-amber-50 hover:border-amber-500 text-stone-800 rounded-xl font-semibold flex items-center justify-between px-6 transition-all"
               >
                 <span className="flex items-center gap-2 text-3xl">{persona.avatar}</span>
                 <div className="text-left flex-1 ml-4">
                   <div className="font-bold text-lg">{persona.name}</div>
                   <div className="text-xs text-gray-500 font-medium">
                       {key === AIDifficulty.SuperHard ? '宗师级' : key === AIDifficulty.Hard ? '资深棋手' : '初学者'}
                   </div>
                 </div>
                 <Play size={20} className="text-amber-500" />
               </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50/50 flex flex-col lg:flex-row items-center justify-center p-4 gap-8 font-sans pt-16 relative overflow-hidden">
      
      {/* Marquee Header */}
      <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-amber-800 to-amber-900 text-amber-100 py-2 shadow-md z-50 border-b border-amber-600 overflow-hidden">
         <div className="animate-marquee whitespace-nowrap font-bold text-lg tracking-wider inline-block">
            传统🙃的五子棋😈 就是把五✋个子连成✍一条线📏 好无趣😐好无聊🙄 而技能♟五子棋👀 就是在传统🙃的五子棋🈚加入技🧜能🌸好好玩🏆 🔥要💥爆了💥 💥技能♟五子棋 🪥飞沙💨走石🌊 技能五子棋😍 力拔🤺山⛰兮💪 技能♟五子棋🪥 飞沙💨走石🌊 技能五子棋🥹 时⇧光⇧⏱倒流🤸
         </div>
      </div>

      {/* Left Panel: Player Black */}
      <div className="order-2 lg:order-1 w-full lg:w-auto flex justify-center">
        <SkillPanel 
          player={Player.Black}
          playerName={gameMode === GameMode.PvE ? "你 (玩家)" : "玩家 1"}
          state={blackState}
          isCurrentTurn={currentPlayer === Player.Black && !winner && !activeSkillAnimation}
          onUseSkill={handleUseSkill}
          avatar="😎"
          canUseDongshan={!!wipedBoard && lastWiper === Player.White}
          hasUsedSkillThisTurn={currentPlayer === Player.Black && hasUsedSkillThisTurn}
          historyLength={history.length}
          pendingSkill={currentPlayer === Player.Black ? pendingSkill : null}
        />
      </div>

      {/* Center: Board & Game Info */}
      <div className="order-1 lg:order-2 flex flex-col items-center gap-4">
        
        {/* Top Bar */}
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-md flex items-center gap-6 px-8 border border-stone-200">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600" title="返回菜单">
            <RotateCcw size={20} />
          </button>
          
          <div className="flex items-center gap-3">
             <h1 className="font-bold text-xl text-amber-900 tracking-wider">
                {winner ? '游戏结束' : '当前回合:'}
             </h1>
             {!winner && (
                 <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                    <div className={`
                        w-5 h-5 rounded-full shadow-sm border border-black/10
                        ${currentPlayer === Player.Black 
                            ? 'bg-gradient-to-br from-gray-800 to-black' 
                            : 'bg-gradient-to-br from-white to-gray-200'}
                    `} />
                    <span className="font-bold text-gray-700">
                        {currentPlayer === Player.Black ? '黑方' : '白方'}
                    </span>
                 </div>
             )}
          </div>
          
          <div className="w-8" /> {/* Spacer */}
        </div>

        {/* Winner Overlay */}
        {winner && (
            <div className="absolute z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center border-8 border-yellow-400 animate-bounce-slight min-w-[300px]">
                    <Trophy size={64} className="text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-4xl font-black text-gray-800 mb-2">
                        {winner === Player.Black ? "黑方获胜!" : "白方获胜!"}
                    </h2>
                    <button 
                        onClick={resetGame}
                        className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-lg shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2 mx-auto w-full"
                    >
                        <RefreshCw size={20} /> 再来一局
                    </button>
                </div>
            </div>
        )}

        <Board 
          board={board} 
          currentPlayer={currentPlayer}
          onCellClick={handleBoardClick} 
          lastMove={lastMove}
          winningLine={winningLine}
          disabled={!!winner || (gameMode === GameMode.PvE && currentPlayer === Player.White) || isThinking || !!activeSkillAnimation}
          activeSkillAnimation={activeSkillAnimation}
          pendingSkill={pendingSkill}
        />

        {/* AI Status / Reasoning Display */}
        {gameMode === GameMode.PvE && (
            <div className="w-full max-w-[500px] min-h-[60px] bg-white border border-stone-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                <div className={`p-2 rounded-full mt-1 ${isThinking ? 'bg-yellow-100 animate-pulse' : 'bg-gray-100'}`}>
                    <Cpu size={20} className={isThinking ? 'text-yellow-600' : 'text-gray-500'} />
                </div>
                <div className="flex-1">
                    <div className="text-xs font-bold text-gray-400 mb-1">
                         {AI_PERSONAS[aiDifficulty].name} 
                         {isThinking ? " 思考中..." : " 说:"}
                    </div>
                    <div className="text-sm text-gray-800 leading-relaxed">
                        {isThinking ? (
                            <span className="italic text-gray-400">正在计算最佳落子...</span>
                        ) : aiReasoning ? (
                            `"${aiReasoning}"`
                        ) : (
                            "该你下棋了。"
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Right Panel: Player White (or AI) */}
      <div className="order-3 lg:order-3 w-full lg:w-auto flex justify-center">
        <SkillPanel 
          player={Player.White}
          playerName={gameMode === GameMode.PvE ? AI_PERSONAS[aiDifficulty].name : "玩家 2"}
          avatar={gameMode === GameMode.PvE ? AI_PERSONAS[aiDifficulty].avatar : "🤠"}
          state={whiteState}
          isCurrentTurn={currentPlayer === Player.White && !winner && !activeSkillAnimation}
          onUseSkill={handleUseSkill}
          canUseDongshan={!!wipedBoard && lastWiper === Player.Black}
          hasUsedSkillThisTurn={currentPlayer === Player.White && hasUsedSkillThisTurn}
          historyLength={history.length}
          pendingSkill={currentPlayer === Player.White ? pendingSkill : null}
        />
      </div>

    </div>
  );
};

export default App;