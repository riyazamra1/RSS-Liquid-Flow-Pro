export type RewardedAdPlacement = 'extra-jar' | 'extra-time' | 'extra-moves' | 'extra-life';

export interface RewardedAdResult {
  status: 'rewarded' | 'dismissed' | 'unavailable';
  message: string;
}

interface H5AdBreakConfig {
  type: 'reward';
  name: string;
  beforeAd?: () => void;
  afterAd?: () => void;
  beforeReward?: (showAdFn: () => void) => void;
  adDismissed?: () => void;
  adViewed?: () => void;
  adBreakDone?: (placementInfo: { breakStatus?: string }) => void;
}

interface CustomRewardedAdsBridge {
  isAdReady?: (placement: RewardedAdPlacement) => boolean;
  showRewardedAd: (
    placement: RewardedAdPlacement
  ) => Promise<boolean | { rewarded: boolean; dismissed?: boolean }>;
}

interface AdsgramController {
  show: () => Promise<{ done?: boolean; state?: string }>;
}

declare global {
  interface Window {
    adBreak?: (config: H5AdBreakConfig) => void;
    rssRewardedAds?: CustomRewardedAdsBridge;
    Adsgram?: {
      init: (config: { blockId: string }) => AdsgramController;
    };
    rssAdsgramBlockId?: string;
  }
}

function getUnavailableMessage(placement: RewardedAdPlacement): string {
  switch (placement) {
    case 'extra-jar':
      return 'No ad available right now. Extra jar stays locked.';
    case 'extra-life':
      return 'No ad available right now. Wait for refill or claim a life from friends.';
    case 'extra-time':
      return 'No ad available right now to add extra time.';
    case 'extra-moves':
      return 'No ad available right now to add extra moves.';
  }
}

/**
 * Checks whether a real rewarded-ad SDK (Android/Native bridge, Telegram Adsgram,
 * or Google H5 Games Ads `adBreak`) is available.
 */
export function isRewardedAdSdkAvailable(placement: RewardedAdPlacement = 'extra-jar'): boolean {
  if (typeof window === 'undefined') return false;
  if (window.rssRewardedAds && typeof window.rssRewardedAds.showRewardedAd === 'function') {
    if (typeof window.rssRewardedAds.isAdReady === 'function') {
      return Boolean(window.rssRewardedAds.isAdReady(placement));
    }
    return true;
  }
  if (window.Adsgram && window.rssAdsgramBlockId) {
    return true;
  }
  return typeof window.adBreak === 'function';
}

/**
 * Requests a genuine rewarded ad from an attached ad provider SDK.
 * Strictly NEVER simulates a fake countdown or grants a reward when no ad fill is available.
 * One completed ad strictly yields ONE reward (1 life, 1 extra jar, +30s, or +5 moves).
 */
export async function requestRewardedAd(
  placement: RewardedAdPlacement
): Promise<RewardedAdResult> {
  const unavailableMsg = getUnavailableMessage(placement);

  if (typeof window === 'undefined') {
    return { status: 'unavailable', message: unavailableMsg };
  }

  // 1. Android Native WebView / Capacitor AdMob / Custom Host Rewarded Ad Bridge
  if (window.rssRewardedAds && typeof window.rssRewardedAds.showRewardedAd === 'function') {
    if (
      typeof window.rssRewardedAds.isAdReady === 'function' &&
      !window.rssRewardedAds.isAdReady(placement)
    ) {
      return { status: 'unavailable', message: unavailableMsg };
    }

    try {
      const outcome = await window.rssRewardedAds.showRewardedAd(placement);
      const rewarded = typeof outcome === 'boolean' ? outcome : Boolean(outcome?.rewarded);
      const dismissed = typeof outcome === 'object' && Boolean(outcome?.dismissed);
      if (rewarded) {
        return { status: 'rewarded', message: 'Reward unlocked!' };
      }
      if (dismissed) {
        return {
          status: 'dismissed',
          message: 'Ad closed early. Watch the full ad to receive the reward.',
        };
      }
      return { status: 'unavailable', message: unavailableMsg };
    } catch {
      return { status: 'unavailable', message: unavailableMsg };
    }
  }

  // 2. Telegram Mini App Adsgram Rewarded Ad SDK
  if (window.Adsgram && window.rssAdsgramBlockId) {
    try {
      const controller = window.Adsgram.init({ blockId: window.rssAdsgramBlockId });
      const res = await controller.show();
      if (res?.done) {
        return { status: 'rewarded', message: 'Reward unlocked!' };
      }
      return {
        status: 'dismissed',
        message: 'Ad closed early. Watch the full ad to receive the reward.',
      };
    } catch {
      return { status: 'unavailable', message: unavailableMsg };
    }
  }

  // 3. Google AdSense H5 Games Ads (`window.adBreak`)
  if (typeof window.adBreak === 'function') {
    return new Promise<RewardedAdResult>((resolve) => {
      let settled = false;
      const finish = (result: RewardedAdResult) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(result);
      };

      const timeoutId = window.setTimeout(() => {
        finish({ status: 'unavailable', message: unavailableMsg });
      }, 6000);

      try {
        window.adBreak!({
          type: 'reward',
          name: placement,
          beforeReward(showAdFn) {
            showAdFn();
          },
          adViewed() {
            finish({ status: 'rewarded', message: 'Reward unlocked!' });
          },
          adDismissed() {
            finish({
              status: 'dismissed',
              message: 'Ad closed early. Watch the full ad to receive the reward.',
            });
          },
          adBreakDone(info) {
            if (!settled) {
              if (info?.breakStatus === 'dismissed') {
                finish({
                  status: 'dismissed',
                  message: 'Ad closed early. Watch the full ad to receive the reward.',
                });
              } else {
                finish({ status: 'unavailable', message: unavailableMsg });
              }
            }
          },
        });
      } catch {
        finish({ status: 'unavailable', message: unavailableMsg });
      }
    });
  }

  // 4. No real ad provider attached — strictly deny reward with zero fake countdown
  return { status: 'unavailable', message: unavailableMsg };
}
