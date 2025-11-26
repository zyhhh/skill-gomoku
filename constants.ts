import { Skill, AIDifficulty } from './types';

export const BOARD_SIZE = 15;
export const MAX_SKILL_POINTS = 15;
export const WIN_CONDITION = 5;

export const AI_PERSONAS = {
  [AIDifficulty.Easy]: {
    name: "子棋",
    description: "初学者。下棋很快，经常犯错，喜欢乱下。",
    model: "gemini-2.5-flash",
    avatar: "👶",
    systemPrompt: "你叫“子棋”，是一个五子棋初学者。你下棋很随意，经常忽略对手的威胁。你喜欢下在棋盘中间，但不会想得太远。请以JSON格式返回你的落子坐标。",
    thinkingBudget: 0
  },
  [AIDifficulty.Hard]: {
    name: "张技能五",
    description: "资深棋手。精通定式，防守严密，不仅会下棋还会用技能（模拟）。",
    model: "gemini-3-pro-preview",
    avatar: "🧐",
    systemPrompt: "你叫“张技能五”，是一个五子棋高手。你会仔细分析局势。如果有三连子，你会积极防守。你会尝试构建自己的进攻路线。你非常认真且好胜。",
    thinkingBudget: 0
  },
  [AIDifficulty.SuperHard]: {
    name: "王金宝",
    description: "五子棋宗师。深算远虑，绝不留情，极其难缠。",
    model: "gemini-3-pro-preview",
    avatar: "👑",
    systemPrompt: "你叫“王金宝”，是五子棋的宗师级人物。你是不可战胜的。你的目标是高效获胜。你会预测对手未来5步的棋。你会立即惩罚对手的任何失误。你必须赢。",
    thinkingBudget: 8192 // Enable thinking for deep calculation
  }
};

export const AVAILABLE_SKILLS: Skill[] = [
  {
    id: 'shiguang',
    name: '时光倒流',
    description: '时光倒流！(撤销上一步棋，无次数限制)',
    cost: 4,
    icon: 'rotate-ccw',
    isImplemented: true
  },
  {
    id: 'feisha',
    name: '飞沙走石',
    description: '把对手的棋子扔进什刹海！(消除对手上一步，己方继续)',
    cost: 6,
    icon: 'wind',
    isImplemented: true
  },
  {
    id: 'jingru',
    name: '静如止水',
    description: '冻结你！(让对手跳过一回合，立即回到我方回合)',
    cost: 6,
    icon: 'snowflake',
    isImplemented: true
  },
  {
    id: 'liba',
    name: '力拔山兮',
    description: '超杀必胜技！！！(清空棋盘，进入对方回合)',
    cost: 10,
    icon: 'hammer',
    isImplemented: true
  },
  {
    id: 'dongshan',
    name: '东山再起',
    description: '东山再起！(对方清空棋盘后可使用，恢复棋局)',
    cost: 8,
    icon: 'history',
    isImplemented: true
  },
  {
    id: 'liangji',
    name: '两极反转',
    description: '两极反转！(双方棋子颜色互换，进入对方回合)',
    cost: 10,
    icon: 'arrow-left-right',
    isImplemented: true
  }
];