import { GoogleGenAI, Type } from "@google/genai";
import { Player, Coordinate, AIDifficulty, MoveResult } from '../types';
import { BOARD_SIZE, AI_PERSONAS } from '../constants';

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Converts the board array to a string representation for the LLM.
 * 0 = Empty, 1 = Black, 2 = White
 */
const boardToString = (board: number[][]): string => {
  let s = `棋盘大小: ${BOARD_SIZE}x${BOARD_SIZE}\n`;
  s += "格式: [行号] 行内容 (0=空, 1=黑, 2=白)\n";
  for (let i = 0; i < BOARD_SIZE; i++) {
    s += `[${i}] ${board[i].join(' ')}\n`;
  }
  return s;
};

/**
 * Gets the next move from the AI.
 */
export const getAIMove = async (
  board: number[][],
  difficulty: AIDifficulty,
  aiPlayer: Player // The player color the AI is playing as
): Promise<MoveResult> => {
  const persona = AI_PERSONAS[difficulty];
  
  // Safety check for missing API key
  if (!process.env.API_KEY) {
    console.error("API Key missing");
    return getFallbackMove(board);
  }

  const prompt = `
    当前棋盘状态:
    ${boardToString(board)}

    你扮演玩家 ID ${aiPlayer} (${aiPlayer === Player.Black ? '黑方' : '白方'}).
    对手是 ID ${aiPlayer === Player.Black ? '2' : '1'}.
    
    请找出最佳的落子坐标 [行, 列]。
    行和列必须在 0 到 ${BOARD_SIZE - 1} 之间。
    选择的位置必须是 0 (空位)。
    
    请提供简短的落子理由（中文）。
  `;

  try {
    const response = await ai.models.generateContent({
      model: persona.model,
      contents: prompt,
      config: {
        systemInstruction: persona.systemPrompt,
        thinkingConfig: persona.thinkingBudget > 0 ? { thinkingBudget: persona.thinkingBudget } : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            row: { type: Type.INTEGER },
            col: { type: Type.INTEGER },
            reasoning: { type: Type.STRING }
          },
          required: ["row", "col"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    const parsed = JSON.parse(jsonText);
    
    // Validation: Check boundaries and if cell is empty
    if (
        parsed.row >= 0 && 
        parsed.row < BOARD_SIZE && 
        parsed.col >= 0 && 
        parsed.col < BOARD_SIZE &&
        board[parsed.row][parsed.col] === Player.None
    ) {
        return {
            row: parsed.row,
            col: parsed.col,
            analysis: parsed.reasoning
        };
    } else {
        console.warn("AI returned invalid or occupied move, using fallback.", parsed);
        return getFallbackMove(board);
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    return getFallbackMove(board);
  }
};

const getFallbackMove = (board: number[][]): MoveResult => {
    // Simple random fallback
    const emptyCells: Coordinate[] = [];
    for(let r=0; r<BOARD_SIZE; r++) {
        for(let c=0; c<BOARD_SIZE; c++) {
            if(board[r][c] === Player.None) {
                emptyCells.push({row: r, col: c});
            }
        }
    }
    
    if(emptyCells.length === 0) return { row: -1, col: -1 }; // Draw/Full
    
    const random = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    return {
        row: random.row,
        col: random.col,
        analysis: "AI连接中断，随机落子"
    };
}