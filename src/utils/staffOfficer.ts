import type {
  Ship,
  Enemy,
  Die,
  CabinType,
  GameConfig,
  BattleLogEntry,
  StaffAnalysis,
  EnemyIntentPattern,
  DiceWasteAnalysis,
  OverheatAnalysis,
  EnergyAnalysis,
  CabinRiskAnalysis,
  AllocationSuggestion,
  StaffStrategyType,
  EnemyIntent,
  TurnSnapshot,
  StaffReasoningTrace,
} from '../types';
import { getAllocations } from './battle';
import { getTotalPoints, getTotalPointsByCabin } from './dice';

const RECENT_TURNS = 3;

export function analyzeRecentTurns(
  logs: BattleLogEntry[],
  currentTurn: number
): TurnSnapshot[] {
  const snapshots: TurnSnapshot[] = [];

  for (let i = Math.max(1, currentTurn - RECENT_TURNS); i < currentTurn; i++) {
    const turnLogs = logs.filter(l => l.turn === i);
    const snapshot = extractTurnSnapshot(turnLogs, i);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  return snapshots;
}

function extractTurnSnapshot(
  turnLogs: BattleLogEntry[],
  turn: number
): TurnSnapshot | null {
  if (turnLogs.length === 0) return null;

  let damageDealt = 0;
  let damageTaken = 0;

  for (const log of turnLogs) {
    if (log.source === 'player' && log.type === 'damage') {
      damageDealt += log.value || 0;
    }
    if (log.source === 'enemy' && log.type === 'damage') {
      damageTaken += log.value || 0;
    }
  }

  return {
    turn,
    playerHp: 0,
    playerShield: 0,
    playerEnergy: 0,
    playerCabins: [],
    enemyHp: 0,
    enemyShield: 0,
    enemyIntent: {
      type: 'attack',
      value: 0,
      description: '',
      icon: '',
    },
    diceAllocation: [],
    damageDealt,
    damageTaken,
  };
}

export function analyzeEnemyPatterns(
  enemy: Enemy,
  recentIntents: EnemyIntent[]
): { patterns: EnemyIntentPattern[]; predicted: EnemyIntent; confidence: number } {
  const allIntents = [...recentIntents, enemy.intent];
  const typeCount: Record<string, { count: number; totalValue: number }> = {};

  for (const intent of allIntents) {
    if (!typeCount[intent.type]) {
      typeCount[intent.type] = { count: 0, totalValue: 0 };
    }
    typeCount[intent.type].count++;
    typeCount[intent.type].totalValue += intent.value;
  }

  const patterns: EnemyIntentPattern[] = Object.entries(typeCount).map(
    ([type, data]) => ({
      type: type as EnemyIntent['type'],
      frequency: data.count / allIntents.length,
      avgValue: Math.floor(data.totalValue / data.count),
      description: getIntentDescription(type as EnemyIntent['type']),
    })
  );

  patterns.sort((a, b) => b.frequency - a.frequency);

  const mostFrequent = patterns[0];
  const predicted: EnemyIntent = {
    type: mostFrequent?.type || 'attack',
    value: mostFrequent?.avgValue || enemy.attack,
    description: `预测：${getIntentDescription(mostFrequent?.type || 'attack')}`,
    icon: getIntentIcon(mostFrequent?.type || 'attack'),
  };

  const confidence = recentIntents.length >= 2 ? 0.7 : 0.4;

  return { patterns, predicted, confidence };
}

function getIntentDescription(type: EnemyIntent['type']): string {
  const descriptions: Record<string, string> = {
    attack: '普通攻击',
    defend: '防御姿态',
    charge: '蓄力攻击',
    special: '特殊技能',
    repair: '自我修复',
  };
  return descriptions[type] || '未知动作';
}

function getIntentIcon(type: EnemyIntent['type']): string {
  const icons: Record<string, string> = {
    attack: '⚔️',
    defend: '🛡️',
    charge: '⚡',
    special: '💥',
    repair: '🔧',
  };
  return icons[type] || '❓';
}

export function analyzeDiceWaste(
  dice: Die[],
  player: Ship,
  config: GameConfig
): DiceWasteAnalysis {
  const wastedDice: string[] = [];
  let totalWasted = 0;
  let reason = '';

  const unassignedDice = dice.filter(d => d.assignedTo === null && d.value > 0);
  const totalUnassigned = unassignedDice.reduce((sum, d) => sum + d.value, 0);

  if (unassignedDice.length > 0) {
    wastedDice.push(...unassignedDice.map(d => d.id));
    totalWasted = totalUnassigned;
    reason = `${unassignedDice.length} 个骰子未分配`;
  }

  const allocations = getAllocations(dice);
  for (const alloc of allocations) {
    const cabin = player.cabins.find(c => c.type === alloc.cabinType);
    if (cabin?.damaged) {
      wastedDice.push(...alloc.diceIds);
      totalWasted += alloc.totalPoints;
      reason = `${cabin.name} 已损坏，分配的骰子被浪费`;
    }
  }

  const suggestion = generateDiceWasteSuggestion(dice, player, config);

  return {
    totalWasted,
    wastedDice,
    reason: reason || '无明显浪费',
    suggestion,
  };
}

function generateDiceWasteSuggestion(
  dice: Die[],
  player: Ship,
  config: GameConfig
): string {
  const unassignedCount = dice.filter(d => d.assignedTo === null && d.value > 0).length;
  
  if (unassignedCount === 0) {
    return '所有骰子已合理分配';
  }

  const damagedCabins = player.cabins.filter(c => c.damaged);
  if (damagedCabins.length > 0) {
    const names = damagedCabins.map(c => c.name).join('、');
    return `避免将骰子分配到已损坏的舱室（${names}）`;
  }

  const weaponDice = dice.filter(d => d.assignedTo === 'weapon');
  const weaponPoints = weaponDice.reduce((s, d) => s + d.value, 0);
  
  if (weaponPoints > config.overheatThreshold) {
    return '武器舱接近过热阈值，考虑将部分骰子转移到其他舱室';
  }

  return '建议将未分配的骰子分配到需要的舱室';
}

export function analyzeOverheatRisks(
  dice: Die[],
  player: Ship,
  config: GameConfig
): OverheatAnalysis[] {
  const cabinTypes: CabinType[] = ['engine', 'shield', 'weapon', 'repair', 'scanner'];
  const results: OverheatAnalysis[] = [];

  for (const cabinType of cabinTypes) {
    const cabin = player.cabins.find(c => c.type === cabinType);
    if (!cabin || cabin.damaged) continue;

    const currentPoints = getTotalPointsByCabin(dice, cabinType);
    const ratio = currentPoints / config.overheatThreshold;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (ratio >= 1) riskLevel = 'high';
    else if (ratio >= 0.8) riskLevel = 'medium';

    const benefitIfOverheat = getOverheatBenefit(cabinType, currentPoints, config);
    const recommendation = getOverheatRecommendation(cabinType, riskLevel, currentPoints, config);

    results.push({
      cabinType,
      currentPoints,
      threshold: config.overheatThreshold,
      riskLevel,
      benefitIfOverheat,
      recommendation,
    });
  }

  return results.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.riskLevel] - order[b.riskLevel];
  });
}

function getOverheatBenefit(
  cabinType: CabinType,
  points: number,
  config: GameConfig
): string {
  if (points <= config.overheatThreshold) {
    return '不会过热，正常工作';
  }

  switch (cabinType) {
    case 'weapon':
      return '过热后武器无法开火，失去攻击能力';
    case 'shield':
      return '过热后护盾无法充能，失去防御加成';
    case 'repair':
      return '过热后维修舱停止工作，无法恢复HP';
    case 'engine':
      return '过热后引擎停转，失去闪避加成';
    case 'scanner':
      return '过热后扫描失效，无法降低敌方闪避';
    default:
      return '过热后舱室失效';
  }
}

function getOverheatRecommendation(
  cabinType: CabinType,
  riskLevel: 'low' | 'medium' | 'high',
  points: number,
  config: GameConfig
): string {
  const excess = points - config.overheatThreshold;

  switch (riskLevel) {
    case 'high':
      return `超过阈值 ${excess} 点，强烈建议减少分配`;
    case 'medium':
      return '接近阈值，注意控制骰子数量';
    case 'low':
    default:
      return '安全范围内';
  }
}

export function analyzeEnergy(
  player: Ship,
  dice: Die[],
  config: GameConfig
): EnergyAnalysis {
  const currentEnergy = player.energy;
  const energyRegen = Math.floor(player.maxEnergy * 0.5);
  const totalDicePoints = getTotalPoints(dice);
  const energyCost = Math.floor(totalDicePoints * config.energyCostPerPoint);
  const projectedNextTurn = Math.min(
    player.maxEnergy,
    Math.max(0, currentEnergy - energyCost) + energyRegen
  );

  let rhythm: 'stable' | 'tight' | 'overflow' = 'stable';
  if (energyCost > currentEnergy * 0.8) {
    rhythm = 'tight';
  } else if (projectedNextTurn >= player.maxEnergy * 0.9) {
    rhythm = 'overflow';
  }

  let recommendation = '能量状态稳定';
  if (rhythm === 'tight') {
    recommendation = '能量紧张，考虑减少骰子使用或保留部分能量';
  } else if (rhythm === 'overflow') {
    recommendation = '能量充足，可以更激进地使用';
  }

  return {
    currentEnergy,
    energyRegen,
    projectedNextTurn,
    rhythm,
    recommendation,
  };
}

export function analyzeCabinRisks(
  player: Ship,
  enemy: Enemy
): CabinRiskAnalysis[] {
  const results: CabinRiskAnalysis[] = player.cabins.map(cabin => {
    let damageRisk = 0;
    let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';

    if (cabin.damaged) {
      damageRisk = 1;
      priority = 'critical';
    } else {
      const hpPercent = player.hp / player.maxHp;
      if (enemy.intent.type === 'special') {
        damageRisk = 0.3;
      }
      if (hpPercent < 0.3) {
        priority = 'high';
      } else if (hpPercent < 0.6) {
        priority = 'medium';
      }
    }

    return {
      cabinType: cabin.type,
      damageRisk,
      currentHp: player.hp,
      maxHp: player.maxHp,
      priority,
    };
  });

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return results.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export function generateStaffAnalysis(
  player: Ship,
  enemy: Enemy,
  dice: Die[],
  config: GameConfig,
  logs: BattleLogEntry[],
  currentTurn: number
): StaffAnalysis {
  const recentIntents = extractRecentEnemyIntents(logs, currentTurn);
  const enemyAnalysis = analyzeEnemyPatterns(enemy, recentIntents);
  const diceWaste = analyzeDiceWaste(dice, player, config);
  const overheatRisks = analyzeOverheatRisks(dice, player, config);
  const energyAnalysis = analyzeEnergy(player, dice, config);
  const cabinRisks = analyzeCabinRisks(player, enemy);

  const overallAssessment = generateOverallAssessment(
    enemyAnalysis.predicted,
    diceWaste,
    overheatRisks,
    energyAnalysis,
    cabinRisks
  );

  const confidence = Math.min(
    1,
    0.3 + (recentIntents.length / RECENT_TURNS) * 0.4 + (currentTurn > 3 ? 0.3 : 0)
  );

  return {
    turn: currentTurn,
    enemyPatterns: enemyAnalysis.patterns,
    predictedNextIntent: enemyAnalysis.predicted,
    diceWaste,
    overheatRisks,
    energyAnalysis,
    cabinRisks,
    overallAssessment,
    confidence,
  };
}

function extractRecentEnemyIntents(
  logs: BattleLogEntry[],
  currentTurn: number
): EnemyIntent[] {
  const intents: EnemyIntent[] = [];

  for (let i = Math.max(1, currentTurn - RECENT_TURNS); i < currentTurn; i++) {
    const turnLogs = logs.filter(l => l.turn === i && l.source === 'enemy');
    if (turnLogs.length > 0) {
      const intent = inferIntentFromLogs(turnLogs);
      if (intent) {
        intents.push(intent);
      }
    }
  }

  return intents;
}

function inferIntentFromLogs(logs: BattleLogEntry[]): EnemyIntent | null {
  const damageLogs = logs.filter(l => l.type === 'damage');
  const totalDamage = damageLogs.reduce((s, l) => s + (l.value || 0), 0);

  if (logs.some(l => l.message.includes('蓄力'))) {
    return { type: 'charge', value: totalDamage, description: '蓄力攻击', icon: '⚡' };
  }
  if (logs.some(l => l.message.includes('防御'))) {
    return { type: 'defend', value: 0, description: '防御姿态', icon: '🛡️' };
  }
  if (logs.some(l => l.message.includes('特殊') || l.message.includes('释放'))) {
    return { type: 'special', value: totalDamage, description: '特殊技能', icon: '💥' };
  }
  if (logs.some(l => l.message.includes('维修') || l.type === 'heal')) {
    return { type: 'repair', value: 0, description: '自我修复', icon: '🔧' };
  }
  if (totalDamage > 0) {
    return { type: 'attack', value: totalDamage, description: '普通攻击', icon: '⚔️' };
  }

  return null;
}

function generateOverallAssessment(
  predictedIntent: EnemyIntent,
  diceWaste: DiceWasteAnalysis,
  overheatRisks: OverheatAnalysis[],
  energyAnalysis: EnergyAnalysis,
  cabinRisks: CabinRiskAnalysis[]
): string {
  const assessments: string[] = [];

  if (predictedIntent.type === 'attack' || predictedIntent.type === 'charge') {
    assessments.push('敌方即将攻击，建议加强防御');
  } else if (predictedIntent.type === 'special') {
    assessments.push('敌方准备释放特殊技能，注意应对');
  } else if (predictedIntent.type === 'defend') {
    assessments.push('敌方进入防御，是进攻的好时机');
  } else if (predictedIntent.type === 'repair') {
    assessments.push('敌方正在修复，建议加大输出');
  }

  const highRiskOverheat = overheatRisks.filter(r => r.riskLevel === 'high');
  if (highRiskOverheat.length > 0) {
    assessments.push(`${highRiskOverheat.length} 个舱室有过热风险`);
  }

  if (diceWaste.totalWasted > 0) {
    assessments.push(`存在 ${diceWaste.totalWasted} 点骰子浪费`);
  }

  if (energyAnalysis.rhythm === 'tight') {
    assessments.push('能量供应紧张');
  }

  if (cabinRisks.some(r => r.priority === 'critical')) {
    assessments.push('有舱室已损坏，需要修复');
  }

  return assessments.length > 0 ? assessments.join('；') : '战斗态势平稳';
}

export function generateAllocationSuggestions(
  dice: Die[],
  player: Ship,
  enemy: Enemy,
  config: GameConfig,
  analysis: StaffAnalysis
): AllocationSuggestion[] {
  const availableDice = dice.filter(d => d.value > 0);
  const sortedDice = [...availableDice].sort((a, b) => b.value - a.value);

  const suggestions: AllocationSuggestion[] = [
    generateBalancedStrategy(sortedDice, player, enemy, config, analysis),
    generateAggressiveStrategy(sortedDice, player, enemy, config, analysis),
    generateDefensiveStrategy(sortedDice, player, enemy, config, analysis),
    generateConservativeStrategy(sortedDice, player, enemy, config, analysis),
  ];

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

function generateBalancedStrategy(
  sortedDice: Die[],
  player: Ship,
  enemy: Enemy,
  config: GameConfig,
  analysis: StaffAnalysis
): AllocationSuggestion {
  const allocations: { cabinType: CabinType; diceIds: string[] }[] = [];
  const diceCopy = [...sortedDice];

  const cabinPriorities: CabinType[] = ['weapon', 'shield', 'engine', 'scanner', 'repair'];
  const dicePerCabin = Math.ceil(diceCopy.length / cabinPriorities.length);

  for (const cabinType of cabinPriorities) {
    const cabin = player.cabins.find(c => c.type === cabinType);
    if (!cabin || cabin.damaged) continue;

    const cabinDice: Die[] = [];
    let points = 0;

    for (let i = 0; i < dicePerCabin && diceCopy.length > 0; i++) {
      const die = diceCopy.shift()!;
      if (points + die.value <= config.overheatThreshold) {
        cabinDice.push(die);
        points += die.value;
      } else {
        diceCopy.unshift(die);
        break;
      }
    }

    if (cabinDice.length > 0) {
      allocations.push({
        cabinType,
        diceIds: cabinDice.map(d => d.id),
      });
    }
  }

  while (diceCopy.length > 0) {
    const die = diceCopy.shift()!;
    let assigned = false;

    for (const alloc of allocations) {
      const currentPoints = alloc.diceIds.reduce((s, id) => {
        const d = sortedDice.find(x => x.id === id);
        return s + (d?.value || 0);
      }, 0);

      if (currentPoints + die.value <= config.overheatThreshold) {
        alloc.diceIds.push(die.id);
        assigned = true;
        break;
      }
    }

    if (!assigned && allocations.length > 0) {
      allocations[0].diceIds.push(die.id);
    }
  }

  const expectedOutcomes = calculateExpectedOutcomes(allocations, sortedDice, player, config);

  return {
    strategy: 'balanced',
    strategyName: '均衡策略',
    description: '攻防兼备，各舱室均匀分配',
    allocations,
    expectedOutcomes,
    risks: ['无明显短板但也无突出优势'],
    benefits: ['适应性强', '过热风险低'],
    confidence: 0.75,
  };
}

function generateAggressiveStrategy(
  sortedDice: Die[],
  player: Ship,
  enemy: Enemy,
  config: GameConfig,
  analysis: StaffAnalysis
): AllocationSuggestion {
  const allocations: { cabinType: CabinType; diceIds: string[] }[] = [];
  const diceCopy = [...sortedDice];

  const weaponCabin = player.cabins.find(c => c.type === 'weapon');
  const scannerCabin = player.cabins.find(c => c.type === 'scanner');

  if (weaponCabin && !weaponCabin.damaged) {
    const weaponDice: Die[] = [];
    let weaponPoints = 0;

    while (diceCopy.length > 0 && weaponPoints + diceCopy[0].value <= config.overheatThreshold) {
      const die = diceCopy.shift()!;
      weaponDice.push(die);
      weaponPoints += die.value;
    }

    if (weaponDice.length > 0) {
      allocations.push({
        cabinType: 'weapon',
        diceIds: weaponDice.map(d => d.id),
      });
    }
  }

  if (scannerCabin && !scannerCabin.damaged && diceCopy.length > 0) {
    const scanDice: Die[] = [];
    let scanPoints = 0;

    while (diceCopy.length > 0 && scanPoints + diceCopy[diceCopy.length - 1].value <= config.overheatThreshold) {
      const die = diceCopy.pop()!;
      scanDice.push(die);
      scanPoints += die.value;
    }

    if (scanDice.length > 0) {
      allocations.push({
        cabinType: 'scanner',
        diceIds: scanDice.map(d => d.id),
      });
    }
  }

  if (diceCopy.length > 0) {
    const shieldCabin = player.cabins.find(c => c.type === 'shield');
    if (shieldCabin && !shieldCabin.damaged) {
      allocations.push({
        cabinType: 'shield',
        diceIds: diceCopy.map(d => d.id),
      });
    }
  }

  const expectedOutcomes = calculateExpectedOutcomes(allocations, sortedDice, player, config);

  let confidence = 0.6;
  if (analysis.predictedNextIntent.type === 'defend') {
    confidence = 0.8;
  } else if (analysis.predictedNextIntent.type === 'repair') {
    confidence = 0.85;
  }

  return {
    strategy: 'aggressive',
    strategyName: '进攻策略',
    description: '集中火力输出，最大化伤害',
    allocations,
    expectedOutcomes,
    risks: ['防御可能不足', '武器舱过热风险'],
    benefits: ['伤害输出最大化', '快速削减敌方血量'],
    confidence,
  };
}

function generateDefensiveStrategy(
  sortedDice: Die[],
  player: Ship,
  enemy: Enemy,
  config: GameConfig,
  analysis: StaffAnalysis
): AllocationSuggestion {
  const allocations: { cabinType: CabinType; diceIds: string[] }[] = [];
  const diceCopy = [...sortedDice];

  const shieldCabin = player.cabins.find(c => c.type === 'shield');
  const engineCabin = player.cabins.find(c => c.type === 'engine');
  const repairCabin = player.cabins.find(c => c.type === 'repair');

  if (shieldCabin && !shieldCabin.damaged) {
    const shieldDice: Die[] = [];
    let shieldPoints = 0;

    while (diceCopy.length > 0 && shieldPoints + diceCopy[0].value <= config.overheatThreshold) {
      const die = diceCopy.shift()!;
      shieldDice.push(die);
      shieldPoints += die.value;
    }

    if (shieldDice.length > 0) {
      allocations.push({
        cabinType: 'shield',
        diceIds: shieldDice.map(d => d.id),
      });
    }
  }

  if (engineCabin && !engineCabin.damaged && diceCopy.length > 0) {
    const engineDice: Die[] = [];
    let enginePoints = 0;

    while (diceCopy.length > 0 && enginePoints + diceCopy[diceCopy.length - 1].value <= config.overheatThreshold) {
      const die = diceCopy.pop()!;
      engineDice.push(die);
      enginePoints += die.value;
    }

    if (engineDice.length > 0) {
      allocations.push({
        cabinType: 'engine',
        diceIds: engineDice.map(d => d.id),
      });
    }
  }

  if (repairCabin && !repairCabin.damaged && diceCopy.length > 0) {
    const hasDamage = player.hp < player.maxHp * 0.8 || player.cabins.some(c => c.damaged);
    if (hasDamage) {
      allocations.push({
        cabinType: 'repair',
        diceIds: diceCopy.map(d => d.id),
      });
    }
  }

  const remainingDice = sortedDice.filter(
    d => !allocations.some(a => a.diceIds.includes(d.id))
  );
  if (remainingDice.length > 0) {
    const weaponCabin = player.cabins.find(c => c.type === 'weapon');
    if (weaponCabin && !weaponCabin.damaged) {
      allocations.push({
        cabinType: 'weapon',
        diceIds: remainingDice.map(d => d.id),
      });
    }
  }

  const expectedOutcomes = calculateExpectedOutcomes(allocations, sortedDice, player, config);

  let confidence = 0.5;
  if (analysis.predictedNextIntent.type === 'attack' || 
      analysis.predictedNextIntent.type === 'charge' ||
      analysis.predictedNextIntent.type === 'special') {
    confidence = 0.8;
  }

  return {
    strategy: 'defensive',
    strategyName: '防御策略',
    description: '优先保障生存，强化护盾和闪避',
    allocations,
    expectedOutcomes,
    risks: ['伤害输出较低', '战斗可能拖长'],
    benefits: ['生存能力强', '容错率高'],
    confidence,
  };
}

function generateConservativeStrategy(
  sortedDice: Die[],
  player: Ship,
  enemy: Enemy,
  config: GameConfig,
  analysis: StaffAnalysis
): AllocationSuggestion {
  const allocations: { cabinType: CabinType; diceIds: string[] }[] = [];
  const diceCopy = [...sortedDice];

  const cabinTypes: CabinType[] = ['shield', 'engine', 'weapon', 'scanner', 'repair'];

  for (const cabinType of cabinTypes) {
    const cabin = player.cabins.find(c => c.type === cabinType);
    if (!cabin || cabin.damaged) continue;

    const cabinDice: Die[] = [];
    let points = 0;
    const safeThreshold = Math.floor(config.overheatThreshold * 0.7);

    while (diceCopy.length > 0 && points + diceCopy[diceCopy.length - 1].value <= safeThreshold) {
      const die = diceCopy.pop()!;
      cabinDice.push(die);
      points += die.value;
    }

    if (cabinDice.length > 0) {
      allocations.push({
        cabinType,
        diceIds: cabinDice.map(d => d.id),
      });
    }
  }

  const expectedOutcomes = calculateExpectedOutcomes(allocations, sortedDice, player, config);

  return {
    strategy: 'conservative',
    strategyName: '保守策略',
    description: '严格控制过热，稳扎稳打',
    allocations,
    expectedOutcomes,
    risks: ['骰子利用率低', '整体效能偏低'],
    benefits: ['零过热风险', '舱室安全有保障'],
    confidence: 0.7,
  };
}

function calculateExpectedOutcomes(
  allocations: { cabinType: CabinType; diceIds: string[] }[],
  allDice: Die[],
  player: Ship,
  config: GameConfig
): {
  damage?: number;
  shield?: number;
  heal?: number;
  evasion?: number;
  scan?: number;
} {
  const outcomes: ReturnType<typeof calculateExpectedOutcomes> = {};

  for (const alloc of allocations) {
    const dice = allDice.filter(d => alloc.diceIds.includes(d.id));
    const totalPoints = dice.reduce((s, d) => s + d.value, 0);
    const isOverheated = totalPoints > config.overheatThreshold;
    const effectivePoints = isOverheated ? 0 : totalPoints;

    const cabin = player.cabins.find(c => c.type === alloc.cabinType);
    const levelMultiplier = cabin ? 1 + (cabin.level - 1) * 0.2 : 1;

    switch (alloc.cabinType) {
      case 'weapon':
        outcomes.damage = Math.floor((player.attack + effectivePoints * 3) * levelMultiplier);
        break;
      case 'shield':
        outcomes.shield = Math.floor(effectivePoints * 3 * levelMultiplier);
        break;
      case 'repair':
        outcomes.heal = Math.floor(effectivePoints * 2 * levelMultiplier);
        break;
      case 'engine':
        outcomes.evasion = Math.min(0.8, effectivePoints * config.engineEvasionBonus * levelMultiplier);
        break;
      case 'scanner':
        outcomes.scan = Math.min(0.5, effectivePoints * config.scanEvasionReduction * levelMultiplier);
        break;
    }
  }

  return outcomes;
}

export function createReasoningTrace(
  analysis: StaffAnalysis,
  suggestions: AllocationSuggestion[],
  selectedStrategy: StaffStrategyType | null,
  playerAction: string,
  outcomeNotes: string
): StaffReasoningTrace {
  return {
    id: `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    turn: analysis.turn,
    timestamp: Date.now(),
    analysis: JSON.parse(JSON.stringify(analysis)),
    suggestions: JSON.parse(JSON.stringify(suggestions)),
    selectedStrategy,
    playerAction,
    outcomeNotes,
  };
}

export function applySuggestion(
  dice: Die[],
  suggestion: AllocationSuggestion
): Die[] {
  return dice.map(die => {
    const allocation = suggestion.allocations.find(a => a.diceIds.includes(die.id));
    return {
      ...die,
      assignedTo: allocation?.cabinType || null,
      locked: allocation !== undefined,
    };
  });
}
