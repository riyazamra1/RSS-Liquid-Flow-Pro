import React, { useCallback, useEffect, useState } from 'react';
import {
  Coins,
  Heart,
  Home,
  Play,
  Settings,
  Sprout,
  Trophy,
  User,
} from 'lucide-react';
import { DailyRewardModal } from './components/DailyRewardModal';
import { DashboardScreen } from './components/DashboardScreen';
import { PuzzleScreen } from './components/PuzzleScreen';
import { RssDropletEmblem } from './components/SceneryArtwork';
import {
  GardenScreen,
  ProfileScreen,
  RewardsScreen,
  SettingsModal,
} from './components/SecondaryScreens';
import { AppScreen, CalculatedDailyReward, GameSettings, PlayerProgress } from './types/game';
import { ACHIEVEMENTS, GARDEN_PLANTS } from './utils/levelGenerator';
import { soundFx } from './utils/sound';
import {
  applyDailyLoginClaim,
  formatDateKey,
  getDailyLoginStatus,
  getMaxUnlockedLevel,
  getOffsetDateKey,
  loadProgress,
  loadSettings,
  MAX_STANDARD_LIVES,
  recomputeLives,
  saveProgress,
  saveSettings,
} from './utils/storage';

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [screen, setScreen] = useState<AppScreen>('home');
  const [activePlayLevel, setActivePlayLevel] = useState<number>(() => loadProgress().currentLevel);
  const [activeIsDaily, setActiveIsDaily] = useState(false);
  const [visibleMapLimit, setVisibleMapLimit] = useState<number>(() =>
    Math.max(40, getMaxUnlockedLevel(loadProgress()) + 24)
  );
  const [referenceDateKey, setReferenceDateKey] = useState<string>(() => formatDateKey());
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [justClaimedTier, setJustClaimedTier] = useState<CalculatedDailyReward | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  // First-visit-each-day detection when opening the dashboard:
  // Automatically surfaces the Daily Login Reward sheet once per calendar day if unclaimed.
  useEffect(() => {
    if (screen !== 'home') return;
    const status = getDailyLoginStatus(progress, referenceDateKey);
    if (status.canClaim) {
      const seenSessionKey = `rss-daily-prompted-${referenceDateKey}`;
      if (!sessionStorage.getItem(seenSessionKey)) {
        sessionStorage.setItem(seenSessionKey, '1');
        setJustClaimedTier(null);
        setDailyModalOpen(true);
      }
    }
  }, [screen, progress, referenceDateKey]);

  const maxUnlocked = getMaxUnlockedLevel(progress);
  const lifeInfo = recomputeLives(progress.lifeState);

  const updateSettings = (next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handleClaimDailyReward = useCallback(() => {
    const result = applyDailyLoginClaim(progress, referenceDateKey);
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
  }, [progress, referenceDateKey, settings.sfx, showToast]);

  const openLevel = useCallback(
    (level: number, isDaily = false) => {
      if (!isDaily && level > maxUnlocked) {
        soundFx.locked(settings.sfx);
        showToast(`Complete Level ${maxUnlocked} to unlock Level ${level}.`);
        return;
      }

      const isCompleted = Boolean(progress.completedLevels[String(level)]);
      const livesNow = recomputeLives(progress.lifeState);
      if (!isDaily && !isCompleted && livesNow.count <= 0) {
        soundFx.locked(settings.sfx);
        showToast('No lives left for a new level. Replay a completed level or claim a bonus life.');
        return;
      }

      soundFx.tap(settings.sfx);
      setActiveIsDaily(isDaily);
      setActivePlayLevel(level);
      setScreen('play');
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [maxUnlocked, progress.completedLevels, progress.lifeState, settings.sfx, showToast]
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
      const nextCount = livesNow.count - 1;
      const nextRefillStart =
        nextCount >= MAX_STANDARD_LIVES
          ? 0
          : livesNow.lastRefillAt || Date.now();
      const updated: PlayerProgress = {
        ...progress,
        lifeState: {
          count: nextCount,
          lastRefillAt: nextRefillStart,
        },
      };
      setProgress(updated);
      saveProgress(updated);
      return true;
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
    }) => {
      setProgress((prev) => {
        const nextCompleted = { ...prev.completedLevels };
        const nextStars = { ...prev.levelStars };
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
        const updated: PlayerProgress = {
          ...prev,
          currentLevel,
          bestLevel,
          levelsCleared,
          completedLevels: nextCompleted,
          levelStars: nextStars,
          coins: prev.coins + payload.coinsEarned,
          score: newScore,
          bestScore: Math.max(prev.bestScore, newScore),
          totalMoves: prev.totalMoves + payload.moves,
          achievements: nextAchievements,
          collections: nextCollections,
          dailyClears: nextDailyClears,
          dailyChallengeStreak,
        };
        saveProgress(updated);
        return updated;
      });
    },
    []
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
    setProgress((prev) => {
      const livesNow = recomputeLives(prev.lifeState);
      const nextCount = livesNow.count + 1;
      const updated: PlayerProgress = {
        ...prev,
        lifeState: {
          count: nextCount,
          lastRefillAt: nextCount >= MAX_STANDARD_LIVES ? 0 : livesNow.lastRefillAt,
        },
      };
      saveProgress(updated);
      return updated;
    });
    showToast('+1 Life earned');
  }, [showToast]);

  const handleShare = useCallback(() => {
    const url = 'https://rssapps.net/games/liquid-flow/';
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast('RSS Liquid Flow link copied to clipboard.');
  }, [showToast]);

  const handleSimulateNextDay = useCallback(() => {
    const nextDate = getOffsetDateKey(referenceDateKey, 1);
    setReferenceDateKey(nextDate);
    setJustClaimedTier(null);
    setScreen('home');
    setDailyModalOpen(true);
    showToast(`Previewing daily login for ${nextDate}.`);
  }, [referenceDateKey, showToast]);

  const navItems: { id: AppScreen; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'play', label: 'Play', icon: Play },
    { id: 'garden', label: 'Garden', icon: Sprout },
    { id: 'rewards', label: 'Rewards', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
  ];

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
      className={`bg-[#FAF6EC] text-[#2D2218] flex flex-col ${
        isPlaying ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Responsive Top Navigation Bar (Strict 3-zone contract on desktop, compact 56px on mobile) */}
      <header className="sticky top-0 z-30 h-14 sm:h-16 bg-[#FFFDF8]/95 backdrop-blur-md border-b border-[#E6DAC0]">
        <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E55A3C] rounded-xl"
          >
            <RssDropletEmblem className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
            <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#2D2218]">
              RSS Liquid Flow
            </span>
          </button>

          {/* Zone 2: Clean Typography Desktop Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-7 text-sm font-semibold text-[#6B5742]"
          >
            {navItems.map((item) => {
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                    active
                      ? 'text-[#2D2218] border-[#E55A3C]'
                      : 'border-transparent hover:text-[#2D2218] hover:border-[#D9C6A3]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Compact Mobile Wallet + Primary Action on Desktop */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex lg:hidden items-center gap-3 text-xs font-bold tabular-nums">
              <span className="inline-flex items-center gap-1 text-[#9A5F0A]">
                <Coins className="w-4 h-4 text-[#E59B14]" />
                {progress.coins}
              </span>
              <span className="inline-flex items-center gap-1 text-[#B82843]">
                <Heart className="w-4 h-4 text-[#D93D59] fill-[#D93D59]" />
                {lifeInfo.count}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              className="lg:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-[#F6EEDB] text-[#4C3A26] cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => openLevel(progress.currentLevel, false)}
              className="hidden lg:inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl btn-tactile-coral text-white font-display text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Level {progress.currentLevel}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Active Screen */}
      <main className={`flex-1 ${isPlaying ? 'min-h-0 overflow-hidden' : ''}`}>
        {screen === 'home' && (
          <DashboardScreen
            progress={progress}
            maxUnlocked={maxUnlocked}
            visibleLimit={visibleMapLimit}
            referenceDateKey={referenceDateKey}
            reduceMotion={settings.reduceMotion}
            onPlayCurrent={() => openLevel(progress.currentLevel, false)}
            onSelectLevel={(lv) => openLevel(lv, false)}
            onLockedTap={handleLockedTap}
            onLoadMore={() => setVisibleMapLimit((prev) => prev + 60)}
            onPlayDaily={() => openLevel(progress.currentLevel, true)}
            onOpenDailyReward={() => {
              setJustClaimedTier(null);
              setDailyModalOpen(true);
            }}
            onClaimDailyRewardInline={() => {
              handleClaimDailyReward();
              setDailyModalOpen(true);
            }}
            onRefillLifeWithCoins={handleRefillLifeWithCoins}
            onNavigate={handleNavClick}
          />
        )}

        {screen === 'play' && (
          <PuzzleScreen
            levelId={activePlayLevel}
            isDaily={activeIsDaily}
            dailyDate={activeIsDaily ? referenceDateKey : undefined}
            progress={progress}
            sfxEnabled={settings.sfx}
            vibrationEnabled={settings.vibration}
            vibrationIntensity={settings.vibrationIntensity}
            showHints={settings.showHints}
            reduceMotion={settings.reduceMotion}
            onExit={() => setScreen('home')}
            onCompleteLevel={handleCompleteLevel}
            onSpendLifeForRetry={handleSpendLifeForRetry}
            availableLives={lifeInfo.count}
            onGrantAdLife={handleGrantAdLife}
            onNextLevel={(nextLv) => openLevel(nextLv, false)}
            onToast={showToast}
          />
        )}

        {screen === 'garden' && <GardenScreen progress={progress} />}

        {screen === 'rewards' && (
          <RewardsScreen
            progress={progress}
            referenceDateKey={referenceDateKey}
            onClaimDailyLogin={() => {
              handleClaimDailyReward();
              setDailyModalOpen(true);
            }}
            onPlayDaily={() => openLevel(progress.currentLevel, true)}
            onShare={handleShare}
          />
        )}

        {screen === 'profile' && (
          <ProfileScreen
            progress={progress}
            referenceDateKey={referenceDateKey}
            onUpdateName={(name) => {
              const updated = { ...progress, playerName: name };
              setProgress(updated);
              saveProgress(updated);
              showToast(`Profile name updated to ${name}.`);
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onSimulateNextDay={handleSimulateNextDay}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (hidden during fixed-screen puzzle play) */}
      {!isPlaying && (
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-[#FFFDF8]/95 backdrop-blur-md border-t border-[#E6DAC0] grid grid-cols-5 items-center"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  active ? 'text-[#D64B2C]' : 'text-[#7A664F]'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Daily Login Reward Sheet */}
      <DailyRewardModal
        open={dailyModalOpen}
        progress={progress}
        referenceDateKey={referenceDateKey}
        justClaimedTier={justClaimedTier}
        onClaim={handleClaimDailyReward}
        onClose={() => setDailyModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Non-intrusive Warm Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#2D2218] text-[#FFFDF8] text-xs sm:text-sm font-medium shadow-xl max-w-[90vw] text-center"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
