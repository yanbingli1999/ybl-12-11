import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, Trophy, Skull, Flag, Calendar, X, Brain, ChevronRight, ChevronDown, Target, Flame, Zap, Shield, TrendingUp } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { useShipStore } from '../store/useShipStore';
import { BattleLog } from '../components/BattleLog/BattleLog';
import { ShipStatus } from '../components/Ship/ShipStatus';
import type { BattleRecord, StaffReasoningTrace, CabinType } from '../types';

export const HistoryPage: React.FC = () => {
  const { 
    battleHistory, 
    loadHistory, 
    battleState,
    replayData,
    replayIndex,
    isReplaying,
    replaySpeed,
    startReplay,
    nextReplayStep,
    prevReplayStep,
    stopReplay,
    setReplaySpeed,
  } = useGameStore();
  const { stats } = useShipStore();
  const [autoPlay, setAutoPlay] = useState(false);
  const [viewingReasoning, setViewingReasoning] = useState<BattleRecord | null>(null);
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!autoPlay || !isReplaying || !replayData) return;
    
    const interval = setInterval(() => {
      if (replayIndex >= replayData.actions.length - 1) {
        setAutoPlay(false);
      } else {
        nextReplayStep();
      }
    }, 2000 / replaySpeed);
    
    return () => clearInterval(interval);
  }, [autoPlay, isReplaying, replayData, replayIndex, replaySpeed, nextReplayStep]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const formatDuration = (start: number, end: number) => {
    const seconds = Math.floor((end - start) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getResultIcon = (result: BattleRecord['result']) => {
    switch (result) {
      case 'victory': return <Trophy className="w-5 h-5 text-neon-yellow" />;
      case 'defeat': return <Skull className="w-5 h-5 text-neon-red" />;
      case 'fled': return <Flag className="w-5 h-5 text-gray-500" />;
      default: return null;
    }
  };

  const getResultText = (result: BattleRecord['result']) => {
    switch (result) {
      case 'victory': return '胜利';
      case 'defeat': return '战败';
      case 'fled': return '撤退';
      default: return '进行中';
    }
  };

  const getResultColor = (result: BattleRecord['result']) => {
    switch (result) {
      case 'victory': return 'text-neon-yellow border-neon-yellow';
      case 'defeat': return 'text-neon-red border-neon-red';
      case 'fled': return 'text-gray-500 border-gray-500';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  const handleToggleAutoPlay = () => {
    if (!isReplaying || !replayData) return;
    if (replayIndex >= replayData.actions.length - 1) {
      startReplay(battleHistory[0]?.id || '');
    }
    setAutoPlay(!autoPlay);
  };

  if (isReplaying && battleState && replayData) {
    return (
      <div className="space-y-6">
        <div className="glass-panel neon-border-yellow p-4 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎬</span>
              <div>
                <h2 className="text-xl font-display font-bold text-neon-yellow">
                  战斗回放
                </h2>
                <p className="text-sm text-gray-400">
                  回放进度: {replayIndex + 1} / {replayData.actions.length}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                stopReplay();
                setAutoPlay(false);
              }}
              className="px-4 py-2 bg-space-700 border border-space-600 rounded-lg text-gray-400 hover:bg-space-600 transition-colors flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              退出回放
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={prevReplayStep}
              disabled={replayIndex <= -1}
              className="p-3 bg-space-700 border border-space-600 rounded-lg text-white hover:bg-space-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={handleToggleAutoPlay}
              className="p-3 bg-neon-blue/20 border border-neon-blue rounded-lg text-neon-blue hover:bg-neon-blue/30 transition-colors"
            >
              {autoPlay ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <button
              onClick={nextReplayStep}
              disabled={replayIndex >= replayData.actions.length - 1}
              className="p-3 bg-space-700 border border-space-600 rounded-lg text-white hover:bg-space-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-400">速度:</span>
              {[0.5, 1, 1.5, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => setReplaySpeed(speed)}
                  className={`
                    px-3 py-1 rounded text-sm font-display
                    ${replaySpeed === speed
                      ? 'bg-neon-blue text-space-900'
                      : 'bg-space-700 text-gray-400 hover:bg-space-600'}
                    transition-colors
                  `}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="w-full bg-space-900 rounded-full h-2">
            <div
              className="bg-neon-yellow h-2 rounded-full transition-all duration-300"
              style={{ width: `${((replayIndex + 1) / replayData.actions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ShipStatus ship={battleState.player} isPlayer={true} />
          <ShipStatus ship={battleState.enemy} isPlayer={false} />
        </div>

        <BattleLog logs={battleState.logs} maxHeight="500px" />
      </div>
    );
  }

  if (viewingReasoning) {
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

    const getStrategyName = (strategy: string | null): string => {
      const names: Record<string, string> = {
        balanced: '均衡策略',
        aggressive: '进攻策略',
        defensive: '防御策略',
        conservative: '保守策略',
      };
      return strategy ? names[strategy] || strategy : '手动分配';
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setViewingReasoning(null);
              setExpandedTrace(null);
            }}
            className="p-2 bg-space-700 rounded-lg text-gray-400 hover:text-white hover:bg-space-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-neon-purple flex items-center gap-2">
              <Brain className="w-6 h-6" />
              参谋推理记录
            </h2>
            <p className="text-sm text-gray-400">
              vs {viewingReasoning.enemyName} - {viewingReasoning.turns} 回合
            </p>
          </div>
        </div>

        {(viewingReasoning.staffReasoning || []).length === 0 ? (
          <div className="glass-panel p-8 rounded-xl text-center">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-gray-400">本场战斗无参谋推理记录</p>
            <p className="text-sm text-gray-500 mt-2">
              可能是参谋系统未启用或战斗时间较早
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(viewingReasoning.staffReasoning || []).map((trace) => (
              <div
                key={trace.id}
                className="glass-panel border border-space-600 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedTrace(
                    expandedTrace === trace.id ? null : trace.id
                  )}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-space-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center">
                      <span className="text-lg font-display font-bold text-neon-purple">
                        {trace.turn}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        第 {trace.turn} 回合分析
                      </div>
                      <div className="text-xs text-gray-400">
                        选择: {getStrategyName(trace.selectedStrategy)} · {trace.outcomeNotes}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      置信度: {Math.round(trace.analysis.confidence * 100)}%
                    </span>
                    {expandedTrace === trace.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedTrace === trace.id && (
                  <div className="px-4 pb-4 border-t border-space-700 pt-4 space-y-4">
                    <div className="bg-space-900/50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-neon-yellow mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        总体评估
                      </div>
                      <p className="text-sm text-gray-300">
                        {trace.analysis.overallAssessment}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-space-900/50 p-3 rounded-lg">
                        <div className="text-sm font-medium text-neon-red mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          敌方意图预测
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{trace.analysis.predictedNextIntent.icon}</span>
                          <div>
                            <div className="text-sm text-white">
                              {trace.analysis.predictedNextIntent.description}
                            </div>
                            {trace.analysis.predictedNextIntent.value > 0 && (
                              <div className="text-xs text-gray-400">
                                预计数值: {trace.analysis.predictedNextIntent.value}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-space-900/50 p-3 rounded-lg">
                        <div className="text-sm font-medium text-neon-cyan mb-2 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          能量节奏
                        </div>
                        <div className="text-sm text-white">
                          当前能量: {trace.analysis.energyAnalysis.currentEnergy}
                        </div>
                        <div className="text-xs text-gray-400">
                          节奏: {trace.analysis.energyAnalysis.rhythm === 'overflow' ? '充沛' :
                                 trace.analysis.energyAnalysis.rhythm === 'stable' ? '稳定' : '紧张'}
                        </div>
                      </div>
                    </div>

                    <div className="bg-space-900/50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-neon-orange mb-2 flex items-center gap-2">
                        <Flame className="w-4 h-4" />
                        过热风险
                      </div>
                      <div className="space-y-1">
                        {trace.analysis.overheatRisks.map((risk, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{getCabinName(risk.cabinType)}</span>
                            <span className={`${
                              risk.riskLevel === 'high' ? 'text-neon-red' :
                              risk.riskLevel === 'medium' ? 'text-neon-yellow' : 'text-neon-green'
                            }`}>
                              {risk.currentPoints}/{risk.threshold} · 
                              {risk.riskLevel === 'high' ? '高风险' :
                               risk.riskLevel === 'medium' ? '中风险' : '安全'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-space-900/50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-neon-blue mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        提供的方案建议
                      </div>
                      <div className="space-y-2">
                        {trace.suggestions.map((sugg, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded border ${
                              trace.selectedStrategy === sugg.strategy
                                ? 'border-neon-purple bg-neon-purple/10'
                                : 'border-space-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white">
                                {sugg.strategyName}
                              </span>
                              <span className="text-xs text-gray-400">
                                置信度: {Math.round(sugg.confidence * 100)}%
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {sugg.description}
                            </div>
                            {trace.selectedStrategy === sugg.strategy && (
                              <div className="text-xs text-neon-purple mt-1">
                                ✓ 玩家选择了此方案
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 bg-space-900/30 p-2 rounded">
                      记录时间: {new Date(trace.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const winRate = stats.totalBattles > 0 
    ? ((stats.victories / stats.totalBattles) * 100).toFixed(1) 
    : '0';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold text-neon-blue">
        战斗记录
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel neon-border p-4 rounded-xl text-center">
          <div className="text-3xl font-display font-bold text-white">
            {stats.totalBattles}
          </div>
          <div className="text-sm text-gray-400">总战斗次数</div>
        </div>
        <div className="glass-panel neon-border-green p-4 rounded-xl text-center">
          <div className="text-3xl font-display font-bold text-neon-green">
            {stats.victories}
          </div>
          <div className="text-sm text-gray-400">胜利场次</div>
        </div>
        <div className="glass-panel neon-border-red p-4 rounded-xl text-center">
          <div className="text-3xl font-display font-bold text-neon-red">
            {stats.defeats}
          </div>
          <div className="text-sm text-gray-400">失败场次</div>
        </div>
        <div className="glass-panel neon-border-yellow p-4 rounded-xl text-center">
          <div className="text-3xl font-display font-bold text-neon-yellow">
            {winRate}%
          </div>
          <div className="text-sm text-gray-400">胜率</div>
        </div>
      </div>

      <div className="glass-panel neon-border p-4 rounded-xl mb-6">
        <h3 className="text-lg font-display font-bold text-white mb-4">统计概览</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400">总回合数</div>
            <div className="font-display font-bold text-white">{stats.totalTurns}</div>
          </div>
          <div>
            <div className="text-gray-400">总伤害输出</div>
            <div className="font-display font-bold text-neon-red">{stats.totalDamageDealt}</div>
          </div>
          <div>
            <div className="text-gray-400">总伤害承受</div>
            <div className="font-display font-bold text-neon-yellow">{stats.totalDamageTaken}</div>
          </div>
          <div>
            <div className="text-gray-400">当前连胜</div>
            <div className="font-display font-bold text-neon-purple">{stats.currentStreak}</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-space-600">
          <div className="text-sm text-gray-400">最长连胜</div>
          <div className="font-display font-bold text-neon-purple">{stats.longestStreak} 场</div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-display font-bold text-white mb-4">历史记录</h3>
        
        {battleHistory.length === 0 ? (
          <div className="glass-panel p-8 rounded-xl text-center">
            <div className="text-4xl mb-4">📜</div>
            <p className="text-gray-400">暂无战斗记录</p>
            <p className="text-sm text-gray-500 mt-2">开始战斗后，记录将显示在这里</p>
          </div>
        ) : (
          <div className="space-y-3">
            {battleHistory.map(record => (
              <div
                key={record.id}
                className="glass-panel p-4 rounded-xl border hover:border-neon-blue/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${getResultColor(record.result)}`}>
                      {getResultIcon(record.result)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-display font-bold ${getResultColor(record.result).split(' ')[0]}`}>
                          {getResultText(record.result)}
                        </span>
                        <span className="text-gray-400">vs</span>
                        <span className="text-white">{record.enemyName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(record.startTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(record.startTime, record.endTime)}
                        </span>
                        <span>回合: {record.turns}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="text-gray-400">
                        <span className="text-neon-green">{record.playerHpRemaining}</span>
                        {' / '}
                        <span className="text-neon-red">{record.enemyHpRemaining}</span>
                      </div>
                      {record.rewardEarned > 0 && (
                        <div className="text-neon-yellow font-display">
                          +{record.rewardEarned} 💰
                        </div>
                      )}
                      {record.staffReasoning && record.staffReasoning.length > 0 && (
                        <div className="text-xs text-neon-purple mt-1">
                          <Brain className="w-3 h-3 inline mr-1" />
                          {record.staffReasoning.length} 条推理记录
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          startReplay(record.id);
                          setAutoPlay(false);
                        }}
                        className="px-4 py-2 bg-neon-blue/20 border border-neon-blue text-neon-blue rounded-lg hover:bg-neon-blue/30 transition-colors flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        回放
                      </button>
                      <button
                        onClick={() => setViewingReasoning(record)}
                        disabled={!record.staffReasoning || record.staffReasoning.length === 0}
                        className="px-4 py-2 bg-neon-purple/20 border border-neon-purple text-neon-purple rounded-lg hover:bg-neon-purple/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Brain className="w-4 h-4" />
                        推理记录
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
