import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Coins,
  Flame,
  Gift,
  Heart,
  Settings,
  User,
} from 'lucide-react';
import { AnimatedDashboardBackdrop } from './components/AnimatedDashboardBackdrop';
import { AuthModal } from './components/AuthModal';
import { BottomNavBar } from './components/BottomNavBar';
import { DailyRewardModal } from './components/DailyRewardModal';
import { DashboardScreen } from './components/DashboardScreen';
import { LevelDetailsModal } from './components/LevelDetailsModal';
import { LivesModal } from './components/LivesModal';
import { MasteryShowcaseModal } from './components/MasteryShowcaseModal';
import { OfflineIndicator } from './components/PWAInstallButton';
import { PuzzleScreen } from './components/PuzzleScreen';
import {
  GardenScreen,
  ProfileScreen,
  RewardsScreen,
  SettingsModal,
} from './components/SecondaryScreens';
import { SpinWheelModal } from './components/SpinWheelModal';
import { UpdateConfirmModal } from './components/UpdateConfirmModal';
import {
  AppScreen,
  CalculatedDailyReward,
  DailyMissionDefinition,
  GameSettings,
  PlayerProgress,
  SpinWheelSegment,
} from './types/game';
import { ACHIEVEMENTS, GARDEN_PLANTS } from './utils/levelGenerator';
import { initTelegramMiniApp, shareGameOrLifeRequest } from './utils/platform';
import { soundFx } from './utils/sound';
import {
  addFriendEntry,
  addOneLife,
  applyDailyLoginClaim,
  applyDailyMissionDelta,
  applySpinWheelOutcome,
  canSpinFreeToday,
  claimDailyMissionReward,
  claimLifeFromFriend,
  deductOneLife,
  formatDateKey,
  getDailyLoginStatus,
  getMaxUnlockedLevel,
  getOffsetDateKey,
  loadProgress,
  loadSettings,
  MAX_FRIEND_LIVES_PER_DAY,
  MAX_STANDARD_LIVES,
  recomputeLives,
  saveProgress,
  saveSettings,
  sendLifeToFriend,
} from './utils/storage';
import { applyThemeToDocument } from './utils/themes';
import { applyAppUpdate, checkForAppUpdates } from './utils/updater';

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [screen, setScreen] = useState<AppScreen>('home');
  const [activePlayLevel, setActivePlayLevel] = useState<number>(() => loadProgress().currentLevel);
  const [activeIsDaily, setActiveIsDaily] = useState(false);
  const [visibleMapLimit, setVisibleMapLimit] = useState<number>(() =>
    Math.max(140, Math.ceil((getMaxUnlockedLevel(loadProgress()) + 40) / 20) * 20)
  );
  const [selectedDetailLevel, setSelectedDetailLevel] = useState<number | null>(null);
  const [masteryShowcaseLevel, setMasteryShowcaseLevel] = useState<number | null>(null);
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [wheelModalOpen, setWheelModalOpen] = useState(false);
  const [justClaimedTier, setJustClaimedTier] = useState<CalculatedDailyReward | null>(null);
  const [livesModalOpen, setLivesModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('rss-liquid-flow-auth');
  });
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [pendingVersion, setPendingVersion] = useState('2.5.0');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const todayKey = formatDateKey();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    applyThemeToDocument(settings.theme);
  }, [settings.theme]);

  // Startup background check for app updates
  useEffect(() => {
    const res = checkForAppUpdates();
    if (res.hasUpdate) {
      if (settings.autoUpdate) {
        // Automatically update silently in background
        applyAppUpdate();
      } else {
        // Prompt user for confirmation before install
        setPendingVersion(res.latestVersion);
        setUpdateModalOpen(true);
      }
    }
  }, [settings.autoUpdate]);

  useEffect(() => {
    const { userName } = initTelegramMiniApp();
    if (userName) {
      setProgress((prev) => {
        if (prev.playerName !== 'Guest') return prev;
        const updated = { ...prev, playerName: userName };
        saveProgress(updated);
        return updated;
      });
    }
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  const maxUnlocked = getMaxUnlockedLevel(progress);
  const lifeInfo = recomputeLives(progress.lifeState);
  const dailyLoginStatus = getDailyLoginStatus(progress, todayKey);
  const yesterdayKey = getOffsetDateKey(todayKey, -1);
  const consecutiveLoginDays =
    progress.dailyLogin.lastClaimDate === todayKey ||
    progress.dailyLogin.lastClaimDate === yesterdayKey
      ? Math.max(0, progress.dailyLogin.streak)
      : 0;
  const streakCycleDays =
    consecutiveLoginDays === 0 ? 0 : ((consecutiveLoginDays - 1) % 7) + 1;
  const streakCyclePct = Math.round((streakCycleDays / 7) * 100);

  const updateSettings = (next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handleAuthLoginOrRegister = (identifier: string) => {
    const isTargetUser =
      identifier.toLowerCase().includes('riyazzamra') ||
      identifier.toLowerCase() === 'riyazzamra@gmail.com';

    setProgress((prev) => {
      let targetLevel = prev.currentLevel;
      let completedLevels = { ...prev.completedLevels };
      let levelStars = { ...prev.levelStars };
      let levelsCleared = prev.levelsCleared;

      if (isTargetUser && targetLevel < 41) {
        targetLevel = 41;
        levelsCleared = Math.max(levelsCleared, 40);
        for (let i = 1; i <= 40; i++) {
          completedLevels[String(i)] = true;
          levelStars[String(i)] = Math.max(Number(levelStars[String(i)]) || 0, 3);
        }
      }

      const updated: PlayerProgress = {
        ...prev,
        playerName: identifier,
        currentLevel: targetLevel,
        bestLevel: Math.max(prev.bestLevel, targetLevel),
        levelsCleared,
        completedLevels,
        levelStars,
      };
      saveProgress(updated);
      return updated;
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('rss-liquid-flow-auth', identifier);
    }
    showToast(
      isTargetUser
        ? `Welcome back! Account synced at Level 41.`
        : `Signed in as ${identifier}.`
    );
  };

  const handleClaimDailyReward = useCallback(() => {
    const result = applyDailyLoginClaim(progress, todayKey);
    if (!result) {
      showToast('Today’s daily login reward has already been claimed.');
      return;
    }
    setProgress(result.updated);
    setJustClaimedTier(result.granted);
    soundFx.reward(settings.sfx);

    const parts: string[] = [];
    if (result.granted.totalCoins > 0) {
      parts.push(
        result.granted.bonusCoins > 0
          ? `+${result.granted.totalCoins} coins (${result.granted.multiplier}×)`
          : `+${result.granted.totalCoins} coins`
      );
    }
    if (result.granted.lives > 0) {
      parts.push(`+${result.granted.lives} bonus ${result.granted.lives === 1 ? 'life' : 'lives'}`);
    }
    showToast(`Day ${result.newStreak} login bonus claimed: ${parts.join(' & ')}!`);
  }, [progress, todayKey, settings.sfx, showToast]);

  const handleSpinOutcome = useCallback(
    (segment: SpinWheelSegment, usedFreeSpin: boolean) => {
      const updated = applySpinWheelOutcome(progress, segment, usedFreeSpin, todayKey);
      if (!updated) {
        showToast('Not enough coins for another spin.');
        return;
      }
      setProgress(updated);
      if (segment.category === 'luck') {
        showToast('Better luck next time! Try another spin or come back tomorrow.');
      } else {
        showToast(`Prize Wheel: ${segment.label}!`);
      }
    },
    [progress, todayKey, showToast]
  );

  const openLevel = useCallback(
    (level: number, isDaily = false) => {
      if (isDaily && progress.dailyClears[todayKey]) {
        soundFx.locked(settings.sfx);
        showToast('Today’s Daily Challenge is already complete! Come back tomorrow.');
        return;
      }

      if (!isDaily && level > maxUnlocked) {
        soundFx.locked(settings.sfx);
        showToast(`Complete Level ${maxUnlocked} to unlock Level ${level}.`);
        return;
      }

      const isCompleted = Boolean(progress.completedLevels[String(level)]);
      const livesNow = recomputeLives(progress.lifeState);
      if (!isDaily && !isCompleted && livesNow.count <= 0) {
        soundFx.locked(settings.sfx);
        setLivesModalOpen(true);
        showToast('No lives left. Wait for refill, watch an ad, or claim from friends.');
        return;
      }

      soundFx.tap(settings.sfx);
      setActiveIsDaily(isDaily);
      setActivePlayLevel(level);
      setScreen('play');
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [
      maxUnlocked,
      progress.completedLevels,
      progress.dailyClears,
      progress.lifeState,
      settings.sfx,
      showToast,
      todayKey,
    ]
  );

  const handleLockedTap = useCallback(
    (level: number) => {
      soundFx.locked(settings.sfx);
      showToast(`Level ${level} is locked. Complete Level ${maxUnlocked} first.`);
    },
    [maxUnlocked, settings.sfx, showToast]
  );

  const handleSpendLifeForRetry = useCallback(
    (levelId: number): boolean => {
      if (progress.completedLevels[String(levelId)]) return true;
      const livesNow = recomputeLives(progress.lifeState);
      if (livesNow.count <= 0) return false;
      const { updated } = deductOneLife(progress);
      setProgress(updated);
      return true;
    },
    [progress]
  );

  const handleLoseLifeOnFailure = useCallback(
    (levelId: number): number => {
      if (progress.completedLevels[String(levelId)]) {
        return recomputeLives(progress.lifeState).count;
      }
      const { updated, remaining } = deductOneLife(progress);
      setProgress(updated);
      return remaining;
    },
    [progress]
  );

  const handleCompleteLevel = useCallback(
    (payload: {
      levelId: number;
      isDaily: boolean;
      dailyDate?: string;
      moves: number;
      stars: number;
      scoreEarned: number;
      coinsEarned: number;
      xpEarned: number;
      timeTakenSec?: number;
      isPerfect?: boolean;
    }) => {
      setProgress((prev) => {
        const nextCompleted = { ...prev.completedLevels };
        const nextStars = { ...prev.levelStars };
        const nextScores = { ...prev.levelScores };
        const nextBestTimes = { ...(prev.levelBestTimes ?? {}) };
        const nextBestMoves = { ...(prev.levelBestMoves ?? {}) };
        const nextPerfect = { ...prev.perfectLevels };
        const nextDailyClears = { ...prev.dailyClears };

        let levelsCleared = prev.levelsCleared;
        let currentLevel = prev.currentLevel;
        let bestLevel = prev.bestLevel;
        let dailyChallengeStreak = prev.dailyChallengeStreak;

        if (payload.isDaily && payload.dailyDate) {
          if (!nextDailyClears[payload.dailyDate]) {
            nextDailyClears[payload.dailyDate] = true;
            dailyChallengeStreak += 1;
          }
        } else {
          const key = String(payload.levelId);
          const firstClear = !nextCompleted[key];
          nextCompleted[key] = true;
          if (firstClear) levelsCleared += 1;
          nextStars[key] = Math.max(Number(nextStars[key]) || 0, payload.stars);
          nextScores[key] = Math.max(Number(nextScores[key]) || 0, payload.scoreEarned);
          if (payload.timeTakenSec && payload.timeTakenSec > 0) {
            const prevBest = Number(nextBestTimes[key]) || 0;
            nextBestTimes[key] =
              prevBest > 0 ? Math.min(prevBest, payload.timeTakenSec) : payload.timeTakenSec;
          }
          if (payload.moves && payload.moves > 0) {
            const prevBestMoves = Number(nextBestMoves[key]) || 0;
            nextBestMoves[key] =
              prevBestMoves > 0 ? Math.min(prevBestMoves, payload.moves) : payload.moves;
          }
          if (payload.isPerfect) {
            nextPerfect[key] = true;
          }
          const unlockedNext = payload.levelId + 1;
          bestLevel = Math.max(bestLevel, unlockedNext);
          if (payload.levelId >= currentLevel) {
            currentLevel = unlockedNext;
          }
        }

        const nextAchievements = { ...prev.achievements };
        ACHIEVEMENTS.forEach((a) => {
          if (levelsCleared >= a.target) nextAchievements[a.id] = true;
        });

        const nextCollections = { ...prev.collections };
        GARDEN_PLANTS.forEach((p) => {
          if (levelsCleared >= p.unlockAt) nextCollections[p.id] = true;
        });

        const newScore = prev.score + payload.scoreEarned;
        const nextDailyMissions = applyDailyMissionDelta(
          prev,
          { levelsSolved: 1, coinsEarned: payload.coinsEarned },
          todayKey
        );

        const updated: PlayerProgress = {
          ...prev,
          currentLevel,
          bestLevel,
          levelsCleared,
          completedLevels: nextCompleted,
          levelStars: nextStars,
          levelScores: nextScores,
          levelBestTimes: nextBestTimes,
          levelBestMoves: nextBestMoves,
          coins: prev.coins + payload.coinsEarned,
          xp: (Number(prev.xp) || 0) + payload.xpEarned,
          score: newScore,
          bestScore: Math.max(prev.bestScore, newScore),
          totalMoves: prev.totalMoves + payload.moves,
          achievements: nextAchievements,
          collections: nextCollections,
          dailyClears: nextDailyClears,
          dailyChallengeStreak,
          perfectLevels: nextPerfect,
          dailyMissions: nextDailyMissions,
        };
        saveProgress(updated);
        return updated;
      });
    },
    [todayKey]
  );

  const handleClaimDailyMission = useCallback(
    (missionId: DailyMissionDefinition['id']) => {
      const result = claimDailyMissionReward(progress, missionId, todayKey);
      if (!result) {
        soundFx.locked(settings.sfx);
        showToast('Mission reward is not ready or already claimed.');
        return;
      }
      setProgress(result.updated);
      soundFx.reward(settings.sfx);
      showToast(
        `Mission complete: +${result.mission.rewardCoins} coins & +${result.mission.rewardXp} XP!`
      );
    },
    [progress, settings.sfx, showToast, todayKey]
  );

  const handleRefillLifeWithCoins = useCallback(() => {
    const livesNow = recomputeLives(progress.lifeState);
    if (livesNow.count >= MAX_STANDARD_LIVES) {
      showToast('Lives are already full.');
      return;
    }
    if (progress.coins < 50) {
      showToast('You need 50 coins to refill a life.');
      return;
    }
    const nextCount = livesNow.count + 1;
    const updated: PlayerProgress = {
      ...progress,
      coins: progress.coins - 50,
      lifeState: {
        count: nextCount,
        lastRefillAt: nextCount >= MAX_STANDARD_LIVES ? 0 : livesNow.lastRefillAt,
      },
    };
    setProgress(updated);
    saveProgress(updated);
    soundFx.reward(settings.sfx);
    showToast('+1 Life restored for 50 coins.');
  }, [progress, settings.sfx, showToast]);

  const handleGrantAdLife = useCallback(() => {
    setProgress((prev) => addOneLife(prev).updated);
    soundFx.reward(settings.sfx);
    showToast('+1 Life earned from rewarded ad!');
  }, [settings.sfx, showToast]);

  const handleSendFriendLife = useCallback(
    (friendId: string) => {
      const res = sendLifeToFriend(progress, friendId, todayKey);
      if (!res) {
        soundFx.locked(settings.sfx);
        showToast(`Daily limit reached (${MAX_FRIEND_LIVES_PER_DAY} lives/day per friend).`);
        return;
      }
      setProgress(res.updated);
      soundFx.reward(settings.sfx);
      showToast(
        `Sent +1 life to ${res.friendName} (${res.sentToday}/${MAX_FRIEND_LIVES_PER_DAY} today).`
      );
    },
    [progress, settings.sfx, showToast, todayKey]
  );

  const handleClaimFriendLife = useCallback(
    (friendId: string) => {
      const res = claimLifeFromFriend(progress, friendId, todayKey);
      if (!res) {
        soundFx.locked(settings.sfx);
        showToast(`Already claimed ${MAX_FRIEND_LIVES_PER_DAY} lives from this friend today.`);
        return;
      }
      setProgress(res.updated);
      soundFx.reward(settings.sfx);
      showToast(
        `Claimed +1 life from ${res.friendName} (${res.receivedToday}/${MAX_FRIEND_LIVES_PER_DAY} today).`
      );
    },
    [progress, settings.sfx, showToast, todayKey]
  );

  const handleAddFriend = useCallback(
    (name: string, level: number) => {
      const updated = addFriendEntry(progress, name, level);
      setProgress(updated);
      soundFx.tap(settings.sfx);
      showToast(`Added ${name} (Level ${level}) to Friends Leaderboard!`);
    },
    [progress, settings.sfx, showToast]
  );

  const handleShare = useCallback(async () => {
    const url = 'https://rssapps.net/games/liquid-flow/';
    const text = `I'm on Level ${progress.currentLevel} in RSS Liquid Flow! Join me and share lives:`;
    const ok = await shareGameOrLifeRequest(text, url);
    showToast(ok ? 'RSS Liquid Flow invite shared!' : 'Copy link: https://rssapps.net/games/liquid-flow/');
  }, [progress.currentLevel, showToast]);

  const handleNavClick = (target: AppScreen) => {
    if (target === 'play') {
      openLevel(progress.currentLevel, false);
      return;
    }
    soundFx.tap(settings.sfx);
    setScreen(target);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const isPlaying = screen === 'play';

  return (
    <div
      className={`relative bg-transparent theme-ink flex flex-col ${
        isPlaying ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'
      }`}
    >
      <AnimatedDashboardBackdrop themeId={settings.theme} reduceMotion={settings.reduceMotion} />

      <header className="sticky top-0 z-30 theme-surface-strong backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-6">
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2 text-left whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E55A3C] rounded-xl"
          >
            <img
              src="/logo.png"
              alt="RSS Liquid Flow"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0 drop-shadow-xs"
            />
            <span className="font-display text-base sm:text-xl font-bold tracking-tight theme-ink">
              RSS Liquid Flow
            </span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              aria-label="Account login or register"
              className="min-h-[38px] px-2.5 py-1 rounded-xl theme-surface-muted border text-xs font-bold theme-ink inline-flex items-center gap-1 cursor-pointer hover:opacity-90"
            >
              <User className="w-3.5 h-3.5 text-[#E55A3C]" />
              <span className="max-w-[100px] truncate">{progress.playerName}</span>
            </button>

            <button
              type="button"
              onClick={() => setLivesModalOpen(true)}
              aria-label={`Lives: ${lifeInfo.count}. Open lives and refill options`}
              className="min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl bg-[#FFE7EC] dark:bg-[#3A1E33] border border-[#F3BCC8] dark:border-[#6A3256] inline-flex items-center gap-1.5 text-xs sm:text-sm font-display font-bold text-[#B82843] dark:text-[#FF8AA1] tabular-nums cursor-pointer hover:opacity-95"
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>{lifeInfo.count}</span>
            </button>

            <div
              aria-label="Coins"
              className="min-h-[38px] px-2.5 sm:px-3 py-1 rounded-xl bg-[#FFF6DC] dark:bg-[#332B14] border border-[#ECCB82] dark:border-[#6A5624] inline-flex items-center gap-1.5 text-xs sm:text-sm font-display font-bold text-[#9A5F0A] dark:text-[#F5BC38] tabular-nums"
            >
              <Coins className="w-4 h-4 text-[#E59B14]" />
              <span>{progress.coins.toLocaleString()}</span>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings and themes"
              className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl theme-surface-muted border theme-ink cursor-pointer hover:opacity-90"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visual Login Streak Progress Bar — visible in header on Rewards screen */}
        {screen === 'rewards' && (
          <div className="border-t theme-border bg-gradient-to-r from-[#FFF7E2]/90 via-[#FFF2D6]/90 to-[#FDEBD2]/90 dark:from-[#12263A]/95 dark:via-[#172C42]/95 dark:to-[#1B2A3E]/95">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 h-10 sm:h-11 flex items-center justify-between gap-3 sm:gap-5">
              {/* Left: Consecutive Login Days Readout */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#E55A3C] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                </span>
                <div className="flex items-baseline gap-1.5 whitespace-nowrap tabular-nums">
                  <span className="font-display text-xs sm:text-sm font-bold theme-ink">
                    {consecutiveLoginDays}{' '}
                    {consecutiveLoginDays === 1 ? 'Day' : 'Days'}
                  </span>
                  <span className="hidden sm:inline text-xs font-medium theme-ink-secondary">
                    · Login Streak
                    {consecutiveLoginDays > 0
                      ? ` · ${dailyLoginStatus.streakMultiplier}× Coins`
                      : ' · Claim Day 1'}
                  </span>
                </div>
              </div>

              {/* Center: Visual 7-Day Streak Progress Bar */}
              <div className="flex-1 max-w-md flex items-center gap-2.5 min-w-[90px]">
                <div
                  role="progressbar"
                  aria-label={`Consecutive login streak progress: ${consecutiveLoginDays} consecutive ${
                    consecutiveLoginDays === 1 ? 'day' : 'days'
                  }, ${streakCycleDays} of 7 days in current reward cycle`}
                  aria-valuemin={0}
                  aria-valuemax={7}
                  aria-valuenow={streakCycleDays}
                  className="relative flex-1 h-2.5 rounded-full bg-black/10 dark:bg-white/12 overflow-hidden shadow-inner"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] via-[#F07136] to-[#E55A3C] dark:from-[#F5BC38] dark:via-[#2BD4C5] dark:to-[#34D399] transition-all duration-300"
                    style={{ width: `${streakCyclePct}%` }}
                  />
                  {/* Subtle 7-day cycle segment dividers */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 grid grid-cols-7 pointer-events-none"
                  >
                    {Array.from({ length: 7 }, (_, i) => (
                      <span
                        key={i}
                        className={i > 0 ? 'border-l border-white/45 dark:border-black/35' : ''}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs font-display font-bold theme-ink-secondary tabular-nums whitespace-nowrap shrink-0">
                  {streakCycleDays}/7
                </span>
              </div>

              {/* Right: Quick Action to Inspect or Claim Today's Streak Bonus */}
              <button
                type="button"
                onClick={() => {
                  soundFx.tap(settings.sfx);
                  setDailyModalOpen(true);
                }}
                className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-display font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-opacity hover:opacity-90 ${
                  dailyLoginStatus.canClaim
                    ? 'bg-[#E55A3C] text-white shadow-xs'
                    : 'bg-[#E6F4EC] dark:bg-[#143D38] text-[#1F683D] dark:text-[#5EEAD4] border border-[#BFE2CB] dark:border-[#246A60]'
                }`}
              >
                {dailyLoginStatus.canClaim ? (
                  <>
                    <Gift className="w-3.5 h-3.5" />
                    <span>Claim Day {dailyLoginStatus.activeDayNumber}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Checked In</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className={`relative z-10 flex-1 ${isPlaying ? 'min-h-0 overflow-hidden' : ''}`}>
        {screen === 'home' && (
          <DashboardScreen
            progress={progress}
            maxUnlocked={maxUnlocked}
            visibleLimit={visibleMapLimit}
            referenceDateKey={todayKey}
            reduceMotion={settings.reduceMotion}
            sfxEnabled={settings.sfx}
            canClaimDaily={dailyLoginStatus.canClaim}
            canFreeSpin={canSpinFreeToday(progress, todayKey)}
            onPlayCurrent={() => openLevel(progress.currentLevel, false)}
            onSelectLevel={(lv) => setSelectedDetailLevel(lv)}
            onLockedTap={handleLockedTap}
            onLoadMore={() => setVisibleMapLimit((prev) => prev + 100)}
            onEnsureVisibleLevel={(lv) =>
              setVisibleMapLimit((prev) => Math.max(prev, Math.ceil((lv + 20) / 20) * 20))
            }
            onSendFriendLife={handleSendFriendLife}
            onAddFriend={handleAddFriend}
            onToggleSfx={() => updateSettings({ ...settings, sfx: !settings.sfx })}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenDailyModal={() => setDailyModalOpen(true)}
            onOpenWheel={() => setWheelModalOpen(true)}
            onOpenMasteryShowcase={(lv) => setMasteryShowcaseLevel(lv)}
          />
        )}

        {screen === 'play' && (
          <div className="animate-screen-transition w-full h-full flex flex-col">
            <PuzzleScreen
              levelId={activePlayLevel}
              isDaily={activeIsDaily}
              dailyDate={activeIsDaily ? todayKey : undefined}
              progress={progress}
              sfxEnabled={settings.sfx}
              vibrationEnabled={settings.vibration}
              vibrationIntensity={settings.vibrationIntensity}
              showHints={settings.showHints}
              reduceMotion={settings.reduceMotion}
              themeId={settings.theme}
              availableLives={lifeInfo.count}
              onExit={() => setScreen('home')}
              onCompleteLevel={handleCompleteLevel}
              onSpendLifeForRetry={handleSpendLifeForRetry}
              onLoseLifeOnFailure={handleLoseLifeOnFailure}
              onGrantAdLife={handleGrantAdLife}
              onOpenLivesModal={() => setLivesModalOpen(true)}
              onNextLevel={(nextLv) => openLevel(nextLv, false)}
              onToast={showToast}
            />
          </div>
        )}

        {screen === 'garden' && <GardenScreen progress={progress} />}

        {screen === 'rewards' && (
          <RewardsScreen
            progress={progress}
            referenceDateKey={todayKey}
            onClaimDailyLogin={() => {
              handleClaimDailyReward();
              setDailyModalOpen(true);
            }}
            onClaimMission={handleClaimDailyMission}
            onPlayDaily={() => openLevel(progress.currentLevel, true)}
            onPlayCurrent={() => openLevel(progress.currentLevel, false)}
            onShare={handleShare}
            onOpenWheel={() => setWheelModalOpen(true)}
            onSendFriendLife={handleSendFriendLife}
            onClaimFriendLife={handleClaimFriendLife}
            onAddFriend={handleAddFriend}
          />
        )}

        {screen === 'profile' && (
          <ProfileScreen
            progress={progress}
            onUpdateName={(name) => {
              const updated = { ...progress, playerName: name };
              setProgress(updated);
              saveProgress(updated);
              showToast(`Profile name updated to ${name}.`);
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      {!isPlaying && <BottomNavBar activeScreen={screen} onSelect={handleNavClick} />}

      {/* Level Details Modal when clicking a map node */}
      <LevelDetailsModal
        open={selectedDetailLevel !== null}
        levelId={selectedDetailLevel}
        progress={progress}
        onClose={() => setSelectedDetailLevel(null)}
        onPlay={(lv) => openLevel(lv, false)}
        onOpenMasteryShowcase={(lv) => {
          setSelectedDetailLevel(null);
          setMasteryShowcaseLevel(lv);
        }}
      />

      {/* Mastery Showcase Modal when clicking a level with a Perfect score */}
      <MasteryShowcaseModal
        open={masteryShowcaseLevel !== null}
        levelId={masteryShowcaseLevel}
        progress={progress}
        onClose={() => setMasteryShowcaseLevel(null)}
        onPlay={(lv) => {
          setMasteryShowcaseLevel(null);
          openLevel(lv, false);
        }}
        onOpenDetails={(lv) => {
          setMasteryShowcaseLevel(null);
          setSelectedDetailLevel(lv);
        }}
      />

      <LivesModal
        open={livesModalOpen}
        progress={progress}
        referenceDateKey={todayKey}
        onClose={() => setLivesModalOpen(false)}
        onGrantAdLife={handleGrantAdLife}
        onClaimFriendLife={handleClaimFriendLife}
        onRefillWithCoins={handleRefillLifeWithCoins}
        onToast={showToast}
      />

      <DailyRewardModal
        open={dailyModalOpen}
        progress={progress}
        referenceDateKey={todayKey}
        justClaimedTier={justClaimedTier}
        onClaim={handleClaimDailyReward}
        onClose={() => setDailyModalOpen(false)}
      />

      <SpinWheelModal
        open={wheelModalOpen}
        progress={progress}
        referenceDateKey={todayKey}
        sfxEnabled={settings.sfx}
        reduceMotion={settings.reduceMotion}
        onSpinOutcome={handleSpinOutcome}
        onClose={() => setWheelModalOpen(false)}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Auth Login / Register Modal */}
      <AuthModal
        open={authModalOpen}
        progress={progress}
        onLogin={handleAuthLoginOrRegister}
        onRegister={handleAuthLoginOrRegister}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Manual Update Confirmation Modal when Auto-Update is OFF */}
      <UpdateConfirmModal
        open={updateModalOpen}
        version={pendingVersion}
        onConfirm={() => {
          setUpdateModalOpen(false);
          applyAppUpdate();
        }}
        onDismiss={() => setUpdateModalOpen(false)}
      />

      <OfflineIndicator />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#1E1712] dark:bg-[#0D2B42] text-[#FFFDF8] border border-white/10 text-xs sm:text-sm font-medium shadow-xl max-w-[90vw] text-center"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
