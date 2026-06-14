import React, { useState, useEffect } from 'react';
import { Brain, Target, Flame, Zap, Shield, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Check, Lightbulb } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useDiceStore } from '../../store/useDiceStore';
import type { StaffStrategyType, CabinType } from '../../types';

export const StaffOfficerPanel: React.FC = () => {
  const { 
    battleState, 
    staffState, 
    updateStaffAnalysis, 
    applyStaffSuggestion,
    toggleStaffActive,
    isReplaying,
  } = useGameStore();
  const { dice } = useDiceStore();
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    if (battleState && staffState.isActive && !isReplaying && battleState.phase === 'player') {
      updateStaffAnalysis();
    }
  }, [battleState?.turn, battleState?.phase, dice, staffState.isActive, isReplaying]);

  if (!battleState || !staffState.isActive) {
    return (
      <div className="glass-panel neon-border-purple p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-display font-bold text-neon-purple flex items-center gap-2">
            <Brain className="w-5 h-5" />
            舰载人工参谋
          </h3>
          <button
            onClick={toggleStaffActive}
            className="text-xs px-2 py-1 bg-space-700 rounded text-gray-400 hover:text-white transition-colors"
          >
            启用
          </button>
        </div>
        <p className="text-gray-500 text-sm text-center py-4">
          参谋系统已停用，点击启用以获得战术建议
        </p>
      </div>
    );
  }

  const { currentAnalysis, suggestions, selectedSuggestion } = staffState;

  if (!currentAnalysis) {
    return (
      <div className="glass-panel neon-border-purple p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-display font-bold text-neon-purple flex items-center gap-2">
            <Brain className="w-5 h-5" />
            舰载人工参谋
          </h3>
          <button
            onClick={toggleStaffActive}
            className="text-xs px-2 py-1 bg-neon-purple/20 rounded text-neon-purple"
          >
            运行中
          </button>
        </div>
        <p className="text-gray-500 text-sm text-center py-4">
          正在分析战场态势...
        </p>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getCabinName = (type: CabinType): string => {
    const names: Record<CabinType, string> = {
      engine: '引擎舱',
      shield: '护盾舱',
      weapon: '武器舱',
      repair: '维修舱',
      scanner: '扫描舱',
    };
    return names[type] || type;
  };

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'high': return 'text-neon-red';
      case 'medium': return 'text-neon-yellow';
      case 'low': return 'text-neon-green';
      default: return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'text-neon-red';
      case 'high': return 'text-neon-orange';
      case 'medium': return 'text-neon-yellow';
      case 'low': return 'text-neon-green';
      default: return 'text-gray-400';
    }
  };

  const getRhythmColor = (rhythm: string): string => {
    switch (rhythm) {
      case 'overflow': return 'text-neon-cyan';
      case 'stable': return 'text-neon-green';
      case 'tight': return 'text-neon-yellow';
      default: return 'text-gray-400';
    }
  };

  const getStrategyIcon = (strategy: StaffStrategyType): string => {
    switch (strategy) {
      case 'balanced': return '⚖️';
      case 'aggressive': return '⚔️';
      case 'defensive': return '🛡️';
      case 'conservative': return '📊';
      default: return '❓';
    }
  };

  const getStrategyBorderColor = (strategy: StaffStrategyType, isSelected: boolean): string => {
    if (isSelected) return 'border-neon-purple bg-neon-purple/10';
    switch (strategy) {
      case 'aggressive': return 'border-neon-red/50 hover:border-neon-red';
      case 'defensive': return 'border-neon-blue/50 hover:border-neon-blue';
      case 'conservative': return 'border-neon-green/50 hover:border-neon-green';
      case 'balanced':
      default: return 'border-neon-yellow/50 hover:border-neon-yellow';
    }
  };

  return (
    <div className="glass-panel neon-border-purple p-4 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-bold text-neon-purple flex items-center gap-2">
          <Brain className="w-5 h-5" />
          舰载人工参谋
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            置信度: {Math.round(currentAnalysis.confidence * 100)}%
          </span>
          <button
            onClick={toggleStaffActive}
            className="text-xs px-2 py-1 bg-space-700 rounded text-gray-400 hover:text-white transition-colors"
          >
            停用
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="bg-space-900/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('overview')}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-space-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Lightbulb className="w-4 h-4 text-neon-yellow" />
              总体评估
            </span>
            {expandedSection === 'overview' ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSection === 'overview' && (
            <div className="px-3 pb-3">
              <p className="text-sm text-gray-300">
                {currentAnalysis.overallAssessment}
              </p>
              <div className="mt-2 text-xs text-gray-500">
                基于最近 {Math.min(3, currentAnalysis.turn - 1)} 回合数据分析
              </div>
            </div>
          )}
        </div>

        <div className="bg-space-900/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('enemy')}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-space-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Target className="w-4 h-4 text-neon-red" />
              敌方意图预测
            </span>
            {expandedSection === 'enemy' ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSection === 'enemy' && (
            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-center gap-2 p-2 bg-neon-red/10 rounded border border-neon-red/30">
                <span className="text-xl">{currentAnalysis.predictedNextIntent.icon}</span>
                <div>
                  <div className="text-sm font-medium text-neon-red">
                    {currentAnalysis.predictedNextIntent.description}
                  </div>
                  {currentAnalysis.predictedNextIntent.value > 0 && (
                    <div className="text-xs text-gray-400">
                      预计数值: {currentAnalysis.predictedNextIntent.value}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <div className="font-medium mb-1">行为模式频率:</div>
                <div className="space-y-1">
                  {currentAnalysis.enemyPatterns.map((pattern, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-gray-400">{pattern.description}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-space-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-neon-red"
                            style={{ width: `${pattern.frequency * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-400 w-8 text-right">
                          {Math.round(pattern.frequency * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-space-900/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('dice')}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-space-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <TrendingUp className="w-4 h-4 text-neon-yellow" />
              骰子效率分析
            </span>
            {expandedSection === 'dice' ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSection === 'dice' && (
            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">浪费点数:</span>
                <span className={currentAnalysis.diceWaste.totalWasted > 0 ? 'text-neon-red font-medium' : 'text-neon-green'}>
                  {currentAnalysis.diceWaste.totalWasted} 点
                </span>
              </div>
              <div className="text-xs text-gray-400">
                原因: {currentAnalysis.diceWaste.reason}
              </div>
              <div className="text-xs text-neon-yellow">
                💡 {currentAnalysis.diceWaste.suggestion}
              </div>
            </div>
          )}
        </div>

        <div className="bg-space-900/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('overheat')}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-space-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Flame className="w-4 h-4 text-neon-orange" />
              过热风险评估
            </span>
            {expandedSection === 'overheat' ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSection === 'overheat' && (
            <div className="px-3 pb-3 space-y-2">
              {currentAnalysis.overheatRisks.length === 0 ? (
                <p className="text-sm text-gray-500">暂无过热风险数据</p>
              ) : (
                currentAnalysis.overheatRisks.map((risk, idx) => (
                  <div key={idx} className="p-2 bg-space-800/50 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white">{getCabinName(risk.cabinType)}</span>
                      <span className={`text-xs font-medium ${getRiskColor(risk.riskLevel)}`}>
                        {risk.riskLevel === 'high' ? '高风险' : risk.riskLevel === 'medium' ? '中风险' : '安全'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-space-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            risk.riskLevel === 'high' ? 'bg-neon-red' :
                            risk.riskLevel === 'medium' ? 'bg-neon-yellow' : 'bg-neon-green'
                          }`}
                          style={{ width: `${Math.min(100, (risk.currentPoints / risk.threshold) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        {risk.currentPoints}/{risk.threshold}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{risk.recommendation}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="bg-space-900/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('energy')}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-space-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Zap className="w-4 h-4 text-neon-cyan" />
              能量节奏分析
            </span>
            {expandedSection === 'energy' ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSection === 'energy' && (
            <div className="px-3 pb-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">当前能量:</span>
                  <div className="text-neon-cyan font-medium">
                    {currentAnalysis.energyAnalysis.currentEnergy}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">每回合恢复:</span>
                  <div className="text-neon-green font-medium">
                    +{currentAnalysis.energyAnalysis.energyRegen}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">能量节奏:</span>
                <span className={`font-medium ${getRhythmColor(currentAnalysis.energyAnalysis.rhythm)}`}>
                  {currentAnalysis.energyAnalysis.rhythm === 'overflow' ? '充沛' :
                   currentAnalysis.energyAnalysis.rhythm === 'stable' ? '稳定' : '紧张'}
                </span>
              </div>
              <p className="text-xs text-neon-cyan">
                💡 {currentAnalysis.energyAnalysis.recommendation}
              </p>
              <div className="text-xs text-gray-500">
                预计下回合开始能量: {currentAnalysis.energyAnalysis.projectedNextTurn}
              </div>
            </div>
          )}
        </div>

        <div className="bg-space-900/50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('cabin')}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-space-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Shield className="w-4 h-4 text-neon-blue" />
              舱室受损风险
            </span>
            {expandedSection === 'cabin' ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSection === 'cabin' && (
            <div className="px-3 pb-3 space-y-2">
              {currentAnalysis.cabinRisks.map((risk, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-space-800/50 rounded">
                  <span className="text-sm text-white">{getCabinName(risk.cabinType)}</span>
                  <div className="flex items-center gap-2">
                    {risk.priority === 'critical' && (
                      <AlertTriangle className="w-4 h-4 text-neon-red" />
                    )}
                    <span className={`text-xs font-medium ${getPriorityColor(risk.priority)}`}>
                      {risk.priority === 'critical' ? '已损坏' :
                       risk.priority === 'high' ? '高危' :
                       risk.priority === 'medium' ? '中危' : '低危'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-space-700 pt-4">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="w-full flex items-center justify-between text-sm font-medium text-neon-purple mb-3"
        >
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            分配方案建议
          </span>
          {showSuggestions ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showSuggestions && (
          <div className="space-y-2">
            {suggestions.map((suggestion) => {
              const isSelected = selectedSuggestion === suggestion.strategy;
              return (
                <div
                  key={suggestion.strategy}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    getStrategyBorderColor(suggestion.strategy, isSelected)
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getStrategyIcon(suggestion.strategy)}</span>
                      <div>
                        <div className="font-medium text-white">{suggestion.strategyName}</div>
                        <div className="text-xs text-gray-400">{suggestion.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">置信度</div>
                      <div className="text-sm font-medium text-neon-purple">
                        {Math.round(suggestion.confidence * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 mb-2 text-xs">
                    {suggestion.expectedOutcomes.damage !== undefined && (
                      <div className="flex items-center justify-between bg-space-900/50 px-2 py-1 rounded">
                        <span className="text-gray-400">预计伤害</span>
                        <span className="text-neon-red font-medium">{suggestion.expectedOutcomes.damage}</span>
                      </div>
                    )}
                    {suggestion.expectedOutcomes.shield !== undefined && (
                      <div className="flex items-center justify-between bg-space-900/50 px-2 py-1 rounded">
                        <span className="text-gray-400">预计护盾</span>
                        <span className="text-neon-cyan font-medium">+{suggestion.expectedOutcomes.shield}</span>
                      </div>
                    )}
                    {suggestion.expectedOutcomes.heal !== undefined && (
                      <div className="flex items-center justify-between bg-space-900/50 px-2 py-1 rounded">
                        <span className="text-gray-400">预计治疗</span>
                        <span className="text-neon-green font-medium">+{suggestion.expectedOutcomes.heal}</span>
                      </div>
                    )}
                    {suggestion.expectedOutcomes.evasion !== undefined && (
                      <div className="flex items-center justify-between bg-space-900/50 px-2 py-1 rounded">
                        <span className="text-gray-400">闪避加成</span>
                        <span className="text-neon-purple font-medium">
                          +{Math.round(suggestion.expectedOutcomes.evasion * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 text-xs mb-2">
                    <div className="flex-1">
                      <div className="text-neon-green mb-1">优势:</div>
                      <ul className="text-gray-400 space-y-0.5">
                        {suggestion.benefits.map((benefit, idx) => (
                          <li key={idx}>• {benefit}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex-1">
                      <div className="text-neon-red mb-1">风险:</div>
                      <ul className="text-gray-400 space-y-0.5">
                        {suggestion.risks.map((risk, idx) => (
                          <li key={idx}>• {risk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      applyStaffSuggestion(suggestion.strategy);
                    }}
                    className={`w-full py-2 rounded text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-neon-purple text-space-900'
                        : 'bg-space-700 text-white hover:bg-space-600'
                    }`}
                  >
                    {isSelected ? '✓ 已应用此方案' : '一键套用此方案'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-600 mt-3">
        套用后可继续手动微调骰子分配
      </p>
    </div>
  );
};
