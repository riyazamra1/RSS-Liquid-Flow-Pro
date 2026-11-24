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

declare global {
  interface Window {
    adBreak?: (config: H5AdBreakConfig) => void;
    rssRewardedAds?: CustomRewardedAdsBridge;
  }
}

/**
 * Checks whether a real rewarded-ad SDK (Google H5 Games Ads `adBreak` or a native/host
 * `window.rssRewardedAds` bridge) is currently loaded in this environment.
 */
export function isRewardedAdSdkAvailable(placement: RewardedAdPlacement = 'extra-jar'): boolean {
  if (typeof window === 'undefined') return false;
  if (window.rssRewardedAds && typeof window.rssRewardedAds.showRewardedAd === 'function') {
    if (typeof window.rssRewardedAds.isAdReady === 'function') {
      return Boolean(window.rssRewardedAds.isAdReady(placement));
    }
    return true;
  }
  return typeof window.adBreak === 'function';
}

/**
 * Requests a genuine rewarded ad from an attached ad provider SDK.
 * Strictly NEVER fakes a countdown or grants a reward when no ad provider/fill is available.
 */
export async function requestRewardedAd(
  placement: RewardedAdPlacement
): Promise<RewardedAdResult> {
  if (typeof window === 'undefined') {
    return {
      status: 'unavailable',
      message: 'No rewarded ad is available right now.',
    };
  }

  // 1. Native WebView / Custom Host Rewarded Ad Bridge
  if (window.rssRewardedAds && typeof window.rssRewardedAds.showRewardedAd === 'function') {
    if (
      typeof window.rssRewardedAds.isAdReady === 'function' &&
      !window.rssRewardedAds.isAdReady(placement)
    ) {
      return {
        status: 'unavailable',
        message: 'No rewarded ad is available right now. Please try again later.',
      };
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
      return {
        status: 'unavailable',
        message: 'No rewarded ad is available right now. Please try again later.',
      };
    } catch {
      return {
        status: 'unavailable',
        message: 'Unable to load a rewarded ad right now. Please try again later.',
      };
    }
  }

  // 2. Google AdSense H5 Games Ads (`window.adBreak`)
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
        finish({
          status: 'unavailable',
          message: 'No rewarded ad is available right now. Please try again later.',
        });
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
              const status = info?.breakStatus;
              if (status === 'dismissed') {
                finish({
                  status: 'dismissed',
                  message: 'Ad closed early. Watch the full ad to receive the reward.',
                });
              } else {
                finish({
                  status: 'unavailable',
                  message: 'No rewarded ad is available right now. Please try again later.',
                });
              }
            }
          },
        });
      } catch {
        finish({
          status: 'unavailable',
          message: 'No rewarded ad is available right now. Please try again later.',
        });
      }
    });
  }

  // 3. No real ad provider attached — strictly deny reward with zero fake countdown
  return {
    status: 'unavailable',
    message: 'No rewarded ad is available right now. Extra jar stays locked until an ad can load.',
  };
}
