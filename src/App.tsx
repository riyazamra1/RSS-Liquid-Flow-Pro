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
import { AnimatedDashboardBackdrop } from './components/AnimatedDashboardBackdrop';
import { DailyRewardModal } from './components/DailyRewardModal';
import { DashboardScreen } from './components/DashboardScreen';
import { LivesModal } from './components/LivesModal';
import { OfflineIndicator } from './components/PWAInstallButton';
import { PuzzleScreen } from './components/PuzzleScreen';
import {
  GardenScreen,
  ProfileScreen,
  RewardsScreen,
  SettingsModal,
} from './components/SecondaryScreens';
import { AppScreen, CalculatedDailyReward, GameSettings, PlayerProgress } from './types/game';
import { ACHIEVEMENTS, GARDEN_PLANTS } from './utils/levelGenerator';
import { initTelegramMiniApp, shareGameOrLifeRequest } from './utils/platform';
import { soundFx } from './utils/sound';
import {
  addFriendEntry,
  addOneLife,
  applyDailyLoginClaim,
  claimLifeFromFriend,
  deductOneLife,
  formatDateKey,
  getMaxUnlockedLevel,
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

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [screen, setScreen] = useState<AppScreen>('home');
  const [activePlayLevel, setActivePlayLevel] = useState<number>(() => loadProgress().currentLevel);
  const [activeIsDaily, setActiveIsDaily] = useState(false);
  const [visibleMapLimit, setVisibleMapLimit] = useState<number>(() =>
    Math.max(40, getMaxUnlockedLevel(loadProgress()) + 24)
  );
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [justClaimedTier, setJustClaimedTier] = useState<CalculatedDailyReward | null>(null);
  const [livesModalOpen, setLivesModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real calendar date only (future preview/claim removed)
  const todayKey = formatDateKey();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  // Apply selected theme globally (CSS variables, .dark class, meta theme-color, Telegram chrome)
  useEffect(() => {
    applyThemeToDocument(settings.theme);
  }, [settings.theme]);

  // Initialize Telegram Mini App SDK when running inside Telegram
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

  const updateSettings = (next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
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

  const openLevel = useCallback(
    (level: number, isDaily = false) => {
      // Daily Challenge can only be played once per calendar day after completion
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
    }) => {
      setProgress((prev) => {
        const nextCompleted = { ...prev.completedLevels };
        const nextStars = { ...prev.levelStars };
        const nextScores = { ...prev.levelScores };
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
          levelScores: nextScores,
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

  const navItems: {
    id: AppScreen;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'home', label: 'Map', icon: Home },
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
      className={`relative bg-transparent theme-ink flex flex-col ${
        isPlaying ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'
      }`}
    >
      {/* Full-Screen Responsive Live Theme Backdrop (zero gaps across all viewports) */}
      <AnimatedDashboardBackdrop themeId={settings.theme} reduceMotion={settings.reduceMotion} />

      {/* Top Navigation Bar: Transparent Logo left · Nav center · Lives, Coins & Settings top-right */}
      <header className="sticky top-0 z-30 h-14 sm:h-16 theme-surface-strong backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-6">
          {/* Brand Logo + Wordmark */}
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

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-7 text-sm font-semibold theme-ink-secondary"
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
                      ? 'theme-ink border-[#E55A3C] dark:border-[#2BD4C5]'
                      : 'border-transparent hover:opacity-90'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Top-Right Corner: Lives, Coins & Settings */}
          <div className="flex items-center gap-2 shrink-0">
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
              aria-label={`Coins: ${progress.coins}`}
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
      </header>

      {/* Main Active Screen */}
      <main className={`relative z-10 flex-1 ${isPlaying ? 'min-h-0 overflow-hidden' : ''}`}>
        {screen === 'home' && (
          <DashboardScreen
            progress={progress}
            maxUnlocked={maxUnlocked}
            visibleLimit={visibleMapLimit}
            referenceDateKey={todayKey}
            reduceMotion={settings.reduceMotion}
            onPlayCurrent={() => openLevel(progress.currentLevel, false)}
            onSelectLevel={(lv) => openLevel(lv, false)}
            onLockedTap={handleLockedTap}
            onLoadMore={() => setVisibleMapLimit((prev) => prev + 60)}
            onSendFriendLife={handleSendFriendLife}
            onClaimFriendLife={handleClaimFriendLife}
            onAddFriend={handleAddFriend}
          />
        )}

        {screen === 'play' && (
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
            onPlayDaily={() => openLevel(progress.currentLevel, true)}
            onShare={handleShare}
            onSendFriendLife={handleSendFriendLife}
            onClaimFriendLife={handleClaimFriendLife}
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
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (hidden during fixed-screen puzzle play) */}
      {!isPlaying && (
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 theme-surface-strong backdrop-blur-md border-t grid grid-cols-5 items-center"
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
                  active ? 'text-[#E55A3C] dark:text-[#2BD4C5]' : 'theme-ink-secondary'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Lives & Refill Modal */}
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

      {/* Daily Login Reward Sheet (Triggered from Rewards tab) */}
      <DailyRewardModal
        open={dailyModalOpen}
        progress={progress}
        referenceDateKey={todayKey}
        justClaimedTier={justClaimedTier}
        onClaim={handleClaimDailyReward}
        onClose={() => setDailyModalOpen(false)}
      />

      {/* Settings & Visual Theme Switcher Modal */}
      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Offline Status Pill (only appears if user goes offline) */}
      <OfflineIndicator />

      {/* Non-intrusive Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#1E1712] dark:bg-[#0D2B42] text-[#FFFDF8] border border-white/10 text-xs sm:text-sm font-medium shadow-xl max-w-[90vw] text-center"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
