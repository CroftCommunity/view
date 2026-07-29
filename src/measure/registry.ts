// The metric registry — the single source of truth for usage measurement.
// MetricName is derived from the keys, so an undeclared metric is a compile
// error, and META is bundled so `expires` is honored at runtime with no server
// contact. This is croft-pwa's telemetry posture, adopted verbatim (privacy
// boundary, disclosure, expiry, consent), with View's own metric set.
//
// Every metric declares a plain-language `disclosure` shown to the user on the
// Metrics page, and an `expires` date after which the client stops emitting it.

export type MetricType = 'page' | 'feature' | 'timing' | 'edge';

export interface MetricMeta {
  /** page | feature | timing | edge. */
  readonly type: MetricType;
  /** Internal, for engineers. */
  readonly description: string;
  /** YYYY-MM-DD. Honored at runtime by the client. */
  readonly expires: string;
  /** Plain-language line shown to the user in the Metrics disclosure panel. */
  readonly disclosure: string;
  /** Open-world optional (page route hint, feature label, timing unit…). */
  readonly info?: string;
}

export const META = {
  page_home: {
    type: 'page',
    description: 'Opened the window (home)',
    expires: '2027-12-31',
    disclosure: 'That the window (home screen) was opened',
    info: 'route',
  },
  page_about: {
    type: 'page',
    description: 'Opened the about page',
    expires: '2027-12-31',
    disclosure: 'That the about screen was opened',
    info: 'route',
  },
  page_metrics: {
    type: 'page',
    description: 'Opened the metrics page',
    expires: '2027-12-31',
    disclosure: 'That the metrics screen was opened',
    info: 'route',
  },
  page_settings: {
    type: 'page',
    description: 'Opened the settings page',
    expires: '2027-12-31',
    disclosure: 'That the settings screen was opened',
    info: 'route',
  },
  feature_theme_toggle: {
    type: 'feature',
    description: 'Switched the light/dark theme',
    expires: '2027-12-31',
    disclosure: 'That the light/dark theme was switched',
    info: 'toggle',
  },
  feature_shelf_switch: {
    type: 'feature',
    description: 'Switched between the Live/Parks/Mine shelves',
    expires: '2027-12-31',
    disclosure: 'That a different shelf was chosen',
    info: 'shelf',
  },
  feature_scene_open: {
    type: 'feature',
    description: 'Opened a scene on the stage',
    expires: '2027-12-31',
    disclosure: 'That a view was opened (not which one)',
    info: 'scene',
  },
  feature_kiosk: {
    type: 'feature',
    description: 'Booted into kiosk mode',
    expires: '2027-12-31',
    disclosure: 'That the wall/kiosk mode was used',
    info: 'kiosk',
  },
} as const satisfies Record<string, MetricMeta>;

export type MetricName = keyof typeof META;

/** The declared metrics as an array, for the disclosure panel. */
export const METRICS: readonly (readonly [MetricName, MetricMeta])[] = Object.entries(META) as [
  MetricName,
  MetricMeta,
][];
