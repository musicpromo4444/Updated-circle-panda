import React, { useMemo } from "react";
import { StandardBannerAd } from "./StandardBannerAd";

/**
 * Item entry produced by injectAdsIntoList
 */
export type InjectedFeedEntry<T> =
  | {
      type: "item";
      item: T;
      /** Unaltered index of the item from the original source array */
      originalIndex: number;
    }
  | {
      type: "ad";
      /** Sequential index of the ad slot (0, 1, 2...) */
      adIndex: number;
      /** Deterministic key for React reconciliation */
      adSlotId: string;
    };

export interface InjectAdsOptions {
  /**
   * Interval at which an ad slot should be inserted.
   * E.g. interval = 4 inserts an ad after every 4 items (after index 3, 7, 11...).
   * E.g. interval = 5 inserts an ad after every 5 items.
   * Defaults to 4.
   */
  interval?: number;

  /**
   * Optional minimum number of items required before the first ad can appear.
   * Defaults to equal to interval.
   */
  minItemsBeforeFirstAd?: number;

  /**
   * Optional prefix for ad slot keys to prevent collision across multiple lists.
   */
  keyPrefix?: string;
}

/**
 * Pure, non-destructive helper to interleave ad placement slots into an array of items.
 *
 * Key Design Principles:
 * 1. Zero Core Disruption: Does NOT mutate the incoming array or modify item properties.
 * 2. Stable Original Indices: Each item preserves its exact originalIndex so event callbacks,
 *    detail navigations, and pagination calculations remain 100% intact.
 * 3. Stable Keys: Ad slots are tagged with deterministic identifiers ('ad-slot-0', 'ad-slot-1')
 *    preventing DOM thrashing or unneeded re-renders during list updates.
 *
 * @param items The original source array (e.g. posts, messages, matches)
 * @param options Configuration options for insertion frequency
 * @returns A new interleaved array containing item and ad tokens
 */
export function injectAdsIntoList<T>(
  items: T[],
  options: InjectAdsOptions = {},
): InjectedFeedEntry<T>[] {
  const { interval = 4, minItemsBeforeFirstAd = interval, keyPrefix = "feed-ad" } = options;

  if (!items || items.length === 0) {
    return [];
  }

  // Guard against invalid non-positive intervals
  const safeInterval = Math.max(1, interval);
  const result: InjectedFeedEntry<T>[] = [];
  let adIndex = 0;

  for (let i = 0; i < items.length; i++) {
    result.push({
      type: "item",
      item: items[i],
      originalIndex: i,
    });

    const itemsProcessed = i + 1;
    // Check if we hit the interval boundary (e.g. after item 4, 8, 12...)
    if (itemsProcessed >= minItemsBeforeFirstAd && itemsProcessed % safeInterval === 0) {
      result.push({
        type: "ad",
        adIndex,
        adSlotId: `${keyPrefix}-slot-${adIndex}`,
      });
      adIndex++;
    }
  }

  return result;
}

/**
 * React Hook that memoizes the ad-interleaved list to prevent unnecessary
 * re-calculations when parent components re-render.
 */
export function useInjectedAds<T>(
  items: T[],
  options: InjectAdsOptions = {},
): InjectedFeedEntry<T>[] {
  const { interval = 4, minItemsBeforeFirstAd, keyPrefix } = options;

  return useMemo(() => {
    return injectAdsIntoList(items, { interval, minItemsBeforeFirstAd, keyPrefix });
  }, [items, interval, minItemsBeforeFirstAd, keyPrefix]);
}

export interface AdFeedInjectorProps<T> {
  /** Source items array */
  items: T[];
  /** Interleave frequency (e.g., every 4 or 5 items) */
  interval?: number;
  /** Custom key extractor for original items */
  keyExtractor?: (item: T, originalIndex: number) => string | number;
  /** Render function for actual feed items */
  renderItem: (item: T, originalIndex: number) => React.ReactNode;
  /** Custom render function for ad slots (defaults to responsive StandardBannerAd) */
  renderAd?: (adIndex: number, adSlotId: string) => React.ReactNode;
  /** Layout container style */
  layout?: "stack" | "grid";
  /** Grid class override when layout="grid" (e.g., "grid-cols-1 sm:grid-cols-2") */
  gridClassName?: string;
  /** Container CSS class name */
  className?: string;
}

/**
 * Platform-agnostic component that renders any feed or grid with automated,
 * responsive ad insertions. Compatible with both mobile Android WebViews and desktop web browsers.
 */
export function AdFeedInjector<T>({
  items,
  interval = 4,
  keyExtractor,
  renderItem,
  renderAd,
  layout = "stack",
  gridClassName = "grid-cols-1 sm:grid-cols-2 gap-4",
  className = "",
}: AdFeedInjectorProps<T>) {
  const entries = useInjectedAds(items, { interval });

  const containerClasses =
    layout === "grid" ? `grid ${gridClassName} ${className}` : `space-y-4 ${className}`;

  return (
    <div className={containerClasses}>
      {entries.map((entry) => {
        if (entry.type === "ad") {
          return (
            <div
              key={entry.adSlotId}
              className={layout === "grid" ? "col-span-full w-full" : "w-full"}
            >
              {renderAd ? (
                renderAd(entry.adIndex, entry.adSlotId)
              ) : (
                <StandardBannerAd index={entry.adIndex} />
              )}
            </div>
          );
        }

        const key = keyExtractor
          ? keyExtractor(entry.item, entry.originalIndex)
          : entry.originalIndex;

        return (
          <React.Fragment key={key}>{renderItem(entry.item, entry.originalIndex)}</React.Fragment>
        );
      })}
    </div>
  );
}
