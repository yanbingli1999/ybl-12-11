export type CabinType = 'engine' | 'shield' | 'weapon' | 'repair' | 'scanner';

export interface Die {
  id: string;
  value: number;
  locked: boolean;
  assignedTo: CabinType | null;
  isRolling: boolean;
}

export interface Cabin {
  id: string;
  type: CabinType;
  name: string;
  level: number;
  damaged: boolean;
  cooldown: number;
  bonus: number;
  description: string;
  icon: string;
}

export interface Ship {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  attack: number;
  defense: number;
  evasion: number;
  critRate: number;
  cabins: Cabin[];
}

export type EnemyIntentType = 'attack' | 'defend' | 'charge' | 'special' | 'repair';

export interface EnemyIntent {
  type: EnemyIntentType;
  value: number;
  description: string;
  icon: string;
}

export interface EnemyAbility {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  currentCooldown: number;
  damage?: number;
  effect?: string;
}

export interface Enemy {
  id: string;
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  attack: number;
  defense: number;
  evasion: number;
  intent: EnemyIntent;
  abilities: EnemyAbility[];
  description: string;
  sprite: string;
}

export type BattleLogType = 'damage' | 'heal' | 'shield' | 'effect' | 'system' | 'crit' | 'miss';

export interface BattleLogEntry {
  id: string;
  turn: number;
  type: BattleLogType;
  source: 'player' | 'enemy' | 'system';
  message: string;
  value?: number;
  timestamp: number;
  isCrit?: boolean;
}

export type BattleResult = 'ongoing' | 'victory' | 'defeat' | 'fled';
export type BattlePhase = 'player' | 'enemy' | 'ended';

export interface BattleState {
  id: string;
  turn: number;
  phase: BattlePhase;
  player: Ship;
  enemy: Enemy;
  logs: BattleLogEntry[];
  result: BattleResult;
  startTime: number;
  endTime?: number;
  rewardPoints: number;
}

export interface GameConfig {
  overheatThreshold: number;
  shieldAbsorptionRate: number;
  critMultiplier: number;
  critBonusRate: number;
  repairCooldown: number;
  energyCostPerPoint: number;
  scanEvasionReduction: number;
  engineEvasionBonus: number;
  maxRerolls: number;
  diceCount: number;
  enemyDamageVariance: number;
}

export interface Upgrade {
  id: string;
  name: string;
  type: 'hp' | 'shield' | 'attack' | 'defense' | 'evasion' | 'crit' | 'energy' | 'cabin';
  cost: number;
  costMultiplier: number;
  effect: number;
  maxLevel: number;
  currentLevel: number;
  description: string;
  cabinType?: CabinType;
}

export interface ReplayAction {
  turn: number;
  phase: 'player' | 'enemy';
  action: string;
  payload: Record<string, unknown>;
  resultingState: BattleState;
}

export interface ReplayData {
  initialState: BattleState;
  actions: ReplayAction[];
}

export interface BattleRecord {
  id: string;
  startTime: number;
  endTime: number;
  result: BattleResult;
  turns: number;
  enemyType: string;
  enemyName: string;
  playerHpRemaining: number;
  enemyHpRemaining: number;
  replayData: ReplayData;
  rewardEarned: number;
  staffReasoning: StaffReasoningTrace[];
}

export interface GameStats {
  totalBattles: number;
  victories: number;
  defeats: number;
  totalTurns: number;
  totalRewardPoints: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  currentStreak: number;
  longestStreak: number;
}

export interface GameSaveData {
  ship: Ship;
  upgrades: Upgrade[];
  config: GameConfig;
  battleHistory: BattleRecord[];
  stats: GameStats;
  rewardPoints: number;
}

export interface DiceFace {
  value: number;
  type: 'normal' | 'critical' | 'energy' | 'wild';
  effect?: string;
  color: string;
}

export interface AllocationResult {
  cabinType: CabinType;
  totalPoints: number;
  diceIds: string[];
  isOverheated: boolean;
}

export interface DamageResult {
  damage: number;
  shieldAbsorbed: number;
  isCrit: boolean;
  isMiss: boolean;
}

export type StaffStrategyType = 'balanced' | 'aggressive' | 'defensive' | 'conservative';

export interface EnemyIntentPattern {
  type: EnemyIntentType;
  frequency: number;
  avgValue: number;
  description: string;
}

export interface DiceWasteAnalysis {
  totalWasted: number;
  wastedDice: string[];
  reason: string;
  suggestion: string;
}

export interface OverheatAnalysis {
  cabinType: CabinType;
  currentPoints: number;
  threshold: number;
  riskLevel: 'low' | 'medium' | 'high';
  benefitIfOverheat: string;
  recommendation: string;
}

export interface EnergyAnalysis {
  currentEnergy: number;
  energyRegen: number;
  projectedNextTurn: number;
  rhythm: 'stable' | 'tight' | 'overflow';
  recommendation: string;
}

export interface CabinRiskAnalysis {
  cabinType: CabinType;
  damageRisk: number;
  currentHp: number;
  maxHp: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface StaffAnalysis {
  turn: number;
  enemyPatterns: EnemyIntentPattern[];
  predictedNextIntent: EnemyIntent;
  diceWaste: DiceWasteAnalysis;
  overheatRisks: OverheatAnalysis[];
  energyAnalysis: EnergyAnalysis;
  cabinRisks: CabinRiskAnalysis[];
  overallAssessment: string;
  confidence: number;
}

export interface AllocationSuggestion {
  strategy: StaffStrategyType;
  strategyName: string;
  description: string;
  allocations: { cabinType: CabinType; diceIds: string[] }[];
  expectedOutcomes: {
    damage?: number;
    shield?: number;
    heal?: number;
    evasion?: number;
    scan?: number;
  };
  risks: string[];
  benefits: string[];
  confidence: number;
}

export interface StaffReasoningTrace {
  id: string;
  turn: number;
  timestamp: number;
  analysis: StaffAnalysis;
  suggestions: AllocationSuggestion[];
  selectedStrategy: StaffStrategyType | null;
  playerAction: string;
  outcomeNotes: string;
}

export interface StaffState {
  isActive: boolean;
  currentAnalysis: StaffAnalysis | null;
  suggestions: AllocationSuggestion[];
  selectedSuggestion: StaffStrategyType | null;
  reasoningHistory: StaffReasoningTrace[];
  lastUpdateTurn: number;
  lastDiceSignature: string;
}

export interface TurnSnapshot {
  turn: number;
  playerHp: number;
  playerShield: number;
  playerEnergy: number;
  playerCabins: Cabin[];
  enemyHp: number;
  enemyShield: number;
  enemyIntent: EnemyIntent;
  diceAllocation: { cabinType: CabinType | null; value: number }[];
  damageDealt: number;
  damageTaken: number;
}
