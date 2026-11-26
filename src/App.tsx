import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Coins,
  Flame,
  Gift,
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
import { LevelDetailsModal } from './components/LevelDetailsModal';
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
import { AvailableUpdate, checkNativeUpdate, downloadNativeUpdate } from './utils/appUpdater';
import { AuthScreen } from './components/AuthScreen';
import { RssPlayerSession, clearPlayerSession, isGuestMode, readPlayerSession, savePlayerSession, setGuestMode, validatePlayerSession } from './utils/rssAuth';

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [screen, setScreen] = useState<AppScreen>('home');
  const [activePlayLevel, setActivePlayLevel] = useState<number>(() => loadProgress().currentLevel);
  const [activeIsDaily, setActiveIsDaily] = useState(false);
  const [visibleMapLimit, setVisibleMapLimit] = useState<number>(() =>
    Math.max(40, getMaxUnlockedLevel(loadProgress()) + 24)
  );
  const [selectedDetailLevel, setSelectedDetailLevel] = useState<number | null>(null);
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [justClaimedTier, setJustClaimedTier] = useState<CalculatedDailyReward | null>(null);
  const [livesModalOpen, setLivesModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [playerSession, setPlayerSession] = useState<RssPlayerSession | null>(null);
  const [guestMode, setGuestModeState] = useState(false);

  const todayKey = formatDateKey();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    applyThemeToDocument(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    let active = true;
    const stored = readPlayerSession();
    if (!stored) {
      setGuestModeState(isGuestMode());
      setAuthReady(true);
      return () => { active = false; };
    }
    // Restore a valid unexpired local session immediately; validate it with RSS Core in the background.
    setPlayerSession(stored);
    setAuthReady(true);
    void validatePlayerSession(stored.token).then((user) => {
      if (!active) return;
      const refreshed = { ...stored, user };
      savePlayerSession(refreshed);
      setPlayerSession(refreshed);
    }).catch(() => {
      clearPlayerSession();
      if (active) setPlayerSession(null);
    });
    return () => { active = false; };
  }, []);

  // Keep the branded boot splash visible for at least 3 seconds from the first HTML paint.
  // Also wait until the app has restored its local authentication state before removing it.
  useEffect(() => {
    if (!authReady) return;
    const splash = document.getElementById('rss-boot-splash');
    if (!splash) return;
    const startedAt = Number(document.documentElement.dataset.rssSplashStartedAt || Date.now());
    const remainingMs = Math.max(0, 3000 - (Date.now() - startedAt));
    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => splash.remove()));
    }, remainingMs);
    return () => window.clearTimeout(timer);
  }, [authReady]);

  // Automatic checks are non-blocking. An available update is presented in-game;
  // downloading and opening Android's installer always requires an explicit tap.
  const checkForNativeUpdate = useCallback(async (manual: boolean) => {
    try {
      const update = await checkNativeUpdate();
      if (!update) {
        if (manual) showToast('Update checks are available in the Android app.');
        return;
      }
      if (update.available && update.apkUrl && update.sha256) {
        setAvailableUpdate(update);
        setSettingsOpen(false);
      } else if (manual) {
        showToast('RSS Liquid Flow is already up to date.');
      }
    } catch (error) {
      console.warn('RSS app update check failed:', error);
      if (manual) showToast('Unable to check for updates. Please try again later.');
    }
  }, [showToast]);

  useEffect(() => {
    if (!settings.autoUpdate) return;
    const checkTimer = window.setTimeout(() => {
      void checkForNativeUpdate(false);
    }, 2500);
    return () => window.clearTimeout(checkTimer);
  }, [settings.autoUpdate, checkForNativeUpdate]);

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
      isPerfect?: boolean;
    }) => {
      setProgress((prev) => {
        const nextCompleted = { ...prev.completedLevels };
        const nextStars = { ...prev.levelStars };
        const nextScores = { ...prev.levelScores };
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
          perfectLevels: nextPerfect,
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

  if (!authReady) return <div className="min-h-screen bg-[#090b2b]" aria-label="Loading RSS Liquid Flow" />;
  if (!playerSession && !guestMode) {
    return <AuthScreen onAuthenticated={(session) => { setPlayerSession(session); setGuestModeState(false); }} onPlayAsGuest={() => { setGuestMode(); setGuestModeState(true); }} />;
  }

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
            onPlayCurrent={() => openLevel(progress.currentLevel, false)}
            onSelectLevel={(lv) => setSelectedDetailLevel(lv)}
            onLockedTap={handleLockedTap}
            onLoadMore={() => setVisibleMapLimit((prev) => prev + 60)}
            onEnsureVisibleLevel={(lv) =>
              setVisibleMapLimit((prev) => Math.max(prev, Math.ceil(lv / 20) * 20))
            }
            onSendFriendLife={handleSendFriendLife}
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

      {/* Level Details Modal when clicking a map node */}
      <LevelDetailsModal
        open={selectedDetailLevel !== null}
        levelId={selectedDetailLevel}
        progress={progress}
        onClose={() => setSelectedDetailLevel(null)}
        onPlay={(lv) => openLevel(lv, false)}
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

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onCheckForUpdates={() => void checkForNativeUpdate(true)}
        onClose={() => setSettingsOpen(false)}
      />

      {availableUpdate && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-update-heading"
        >
          <div className="w-full max-w-sm rounded-3xl theme-surface border p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2">
              <img src="/logo.png" alt="RSS Liquid Flow" className="h-full w-full object-contain" />
            </div>
            <h2 id="app-update-heading" className="text-center font-display text-xl font-bold theme-ink">
              Update available
            </h2>
            <p className="mt-2 text-center text-sm theme-ink-secondary">
              RSS Liquid Flow Pro {availableUpdate.versionName ?? ''} is ready. Your game progress is kept.
              You can install now or continue playing and update later.
            </p>
            <button
              type="button"
              disabled={updateBusy}
              onClick={async () => {
                setUpdateBusy(true);
                try {
                  await downloadNativeUpdate(availableUpdate);
                } catch (error) {
                  console.warn('RSS app update download failed:', error);
                  showToast('Update download failed. Please try again later.');
                } finally {
                  setUpdateBusy(false);
                }
              }}
              className="mt-5 w-full min-h-[48px] rounded-2xl btn-tactile-emerald text-white font-display font-bold disabled:opacity-60"
            >
              {updateBusy ? 'Downloading update…' : 'Update now'}
            </button>
            <button
              type="button"
              disabled={updateBusy}
              onClick={() => setAvailableUpdate(null)}
              className="mt-2 w-full min-h-[44px] rounded-2xl theme-surface-muted border font-semibold theme-ink disabled:opacity-60"
            >
              Later
            </button>
          </div>
        </div>
      )}

      <OfflineIndicator />

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
