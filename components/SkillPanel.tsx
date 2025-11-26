import React from 'react';
import { Player, PlayerState } from '../types';
import { AVAILABLE_SKILLS, MAX_SKILL_POINTS } from '../constants';
import { Zap, Wind, Snowflake, Hammer, History, ArrowLeftRight, RotateCcw } from 'lucide-react';

interface SkillPanelProps {
  player: Player;
  isCurrentTurn: boolean;
  state: PlayerState;
  onUseSkill: (skillId: string) => void;
  playerName: string;
  avatar?: string;
  canUseDongshan?: boolean; // Special check for Dongshan skill
  hasUsedSkillThisTurn: boolean;
  historyLength: number;
  pendingSkill?: string | null;
}

const SkillPanel: React.FC<SkillPanelProps> = ({ 
  player, 
  isCurrentTurn, 
  state, 
  onUseSkill,
  playerName,
  avatar,
  canUseDongshan,
  hasUsedSkillThisTurn,
  historyLength,
  pendingSkill
}) => {
  const isBlack = player === Player.Black;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'wind': return <Wind size={18} />;
      case 'snowflake': return <Snowflake size={18} />;
      case 'hammer': return <Hammer size={18} />;
      case 'history': return <History size={18} />;
      case 'arrow-left-right': return <ArrowLeftRight size={18} />;
      case 'rotate-ccw': return <RotateCcw size={18} />;
      default: return <Zap size={18} />;
    }
  };

  return (
    <div className={`
      flex flex-col gap-3 p-4 rounded-xl shadow-lg transition-all duration-300 w-full md:w-72
      ${isCurrentTurn ? 'bg-white scale-105 ring-4 ring-amber-400/50 z-10' : 'bg-stone-100 opacity-80 grayscale-[0.5]'}
    `}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
        <div className="text-4xl filter drop-shadow-sm transform hover:scale-110 transition-transform cursor-default">
            {avatar || (isBlack ? '😎' : '🤠')}
        </div>
        <div className="flex-1">
          <h3 className={`font-bold text-lg truncate ${isCurrentTurn ? 'text-amber-700' : 'text-gray-600'}`}>
            {playerName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
             {/* Stone Indicator */}
             <div className={`
                w-4 h-4 rounded-full shadow-sm border border-black/10
                ${isBlack 
                    ? 'bg-gradient-to-br from-gray-800 to-black' 
                    : 'bg-gradient-to-br from-white to-gray-200'}
             `} />
             <p className="text-xs text-gray-500 font-bold">
                {isBlack ? '执黑 (先手)' : '执白 (后手)'}
             </p>
          </div>
        </div>
      </div>

      {/* Skill Points Meter */}
      <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 shadow-inner">
        <div className="flex justify-between text-xs mb-1.5 font-bold text-gray-700">
          <span className="flex items-center gap-1"><Zap size={12} className="text-yellow-500 fill-yellow-500"/> 技能能量</span>
          <span className={state.skillPoints === MAX_SKILL_POINTS ? "text-red-500 animate-pulse" : ""}>
            {state.skillPoints} <span className="text-gray-400">/</span> {MAX_SKILL_POINTS}
          </span>
        </div>
        
        {/* Enhanced Progress Bar */}
        <div className="h-5 bg-gray-200 rounded-full overflow-hidden border border-gray-300 relative shadow-inner">
          {/* Markers for 5 and 10 (33% and 66%) */}
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/60 z-10 border-r border-gray-300/30"></div>
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/60 z-10 border-r border-gray-300/30"></div>
          
          {/* Fill */}
          <div 
            className={`h-full transition-all duration-500 ease-out relative
                ${state.skillPoints >= MAX_SKILL_POINTS 
                    ? 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500' 
                    : 'bg-gradient-to-r from-yellow-400 to-amber-500'}
            `}
            style={{ width: `${(state.skillPoints / MAX_SKILL_POINTS) * 100}%` }}
          >
             {/* Shine Effect */}
             <div className="absolute top-0 left-0 w-full h-[40%] bg-white/30 rounded-t-full"></div>
          </div>
        </div>
        
        {state.isDoubleMoveActive && (
            <div className="mt-1 text-xs text-center text-blue-600 font-bold animate-pulse bg-blue-50 rounded py-1 border border-blue-100">
                ❄️ 下一回合对手将跳过!
            </div>
        )}
      </div>

      {/* Skills Grid */}
      <div className="space-y-2 mt-1">
        {AVAILABLE_SKILLS.map((skill) => {
          // Logic: Is this skill permanently used up?
          // 'shiguang' can be used multiple times, so we ignore the usedSkills list for it.
          const isPermanentlyUsed = skill.id !== 'shiguang' && state.usedSkills.includes(skill.id);
          
          const canAfford = state.skillPoints >= skill.cost;
          
          // Specific logic for Dongshan
          const isDongshan = skill.id === 'dongshan';
          const isShiguang = skill.id === 'shiguang';
          const isPending = pendingSkill === skill.id;
          
          let specialCondition = true;
          if (isDongshan) specialCondition = !!canUseDongshan;
          if (isShiguang) specialCondition = historyLength >= 3; // Must have played at least once (Empty + MyMove + OpponentMove = 3)

          // General usability check
          const canUse = isCurrentTurn && canAfford && !isPermanentlyUsed && skill.isImplemented && specialCondition && !hasUsedSkillThisTurn;

          return (
            <button
              key={skill.id}
              disabled={!canUse && !isPending}
              onClick={() => onUseSkill(skill.id)}
              className={`
                group relative w-full flex items-center justify-between p-2.5 rounded-lg border text-sm transition-all overflow-hidden
                ${isPending 
                  ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-300 animate-pulse text-amber-900 shadow-md'
                  : isPermanentlyUsed 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default' 
                    : canUse
                      ? 'bg-white border-amber-200 hover:border-amber-500 hover:bg-amber-50 hover:shadow-md active:scale-95 text-gray-800 shadow-sm'
                      : 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed opacity-70'}
              `}
            >
              <div className="flex items-center gap-3 z-10">
                <div className={`p-1.5 rounded-md ${isPending ? 'bg-amber-200 text-amber-800' : canUse ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>
                    {getIcon(skill.icon)}
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-bold leading-none">{skill.name}</span>
                    {isPending && <span className="text-[10px] text-amber-600 font-bold">请点击棋子</span>}
                </div>
              </div>
              
              <div className="flex items-center gap-1 font-bold z-10">
                {isPermanentlyUsed ? (
                   <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-400 border border-gray-300 px-1.5 py-0.5 rounded">已使用</span>
                ) : (
                  <div className={`text-xs px-2 py-0.5 rounded-full ${isPending ? 'bg-amber-200 text-amber-800' : canUse ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-500'}`}>
                    {skill.cost} SP
                  </div>
                )}
              </div>

               {/* Description Tooltip */}
               {!isPermanentlyUsed && canUse && !isPending && (
                   <div className="absolute inset-0 bg-amber-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 px-3 text-center leading-tight font-medium">
                       {skill.description}
                   </div>
               )}
               
               {/* Warning Overlay */}
               {isCurrentTurn && !isPermanentlyUsed && !canUse && hasUsedSkillThisTurn && !isPending && (
                   <div className="absolute inset-0 bg-gray-100/90 flex items-center justify-center text-xs text-red-500 font-bold z-20">
                      本回合已使用技能
                   </div>
               )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SkillPanel;