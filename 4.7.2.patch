import { describe, expect, it } from 'vitest';

import {
  BROWSER_TARGETS,
  BROWSER_TARGETS_OVERRIDE_ENV,
  getBrowserTargets,
  parseBrowserTargetsOverride,
} from './environments-support.ts';

describe('environments-support', () => {
  describe('parseBrowserTargetsOverride', () => {
    it('parses a comma-separated target list', () => {
      expect(parseBrowserTargetsOverride('chrome120, firefox115')).toEqual([
        'chrome120',
        'firefox115',
      ]);
    });

    it('parses a JSON target list', () => {
      expect(parseBrowserTargetsOverride('["chrome120", "firefox115"]')).toEqual([
        'chrome120',
        'firefox115',
      ]);
    });

    it('parses a single target string', () => {
      expect(parseBrowserTargetsOverride('chrome120')).toBe('chrome120');
      expect(parseBrowserTargetsOverride('"chrome120"')).toBe('chrome120');
    });

    it('throws for unsupported values', () => {
      expect(() => parseBrowserTargetsOverride('{"chrome":"120"}')).toThrowError(
        `Expected ${BROWSER_TARGETS_OVERRIDE_ENV} to be a non-empty target string, a comma-separated target list, or a JSON string/JSON array of target strings.`
      );
    });
  });

  describe('getBrowserTargets', () => {
    it('falls back to the default browser targets when no override is set', () => {
      expect(getBrowserTargets({ env: {} })).toEqual(BROWSER_TARGETS);
    });

    it('uses the override when present', () => {
      expect(
        getBrowserTargets({
          env: { [BROWSER_TARGETS_OVERRIDE_ENV]: 'chrome120, firefox115' },
        })
      ).toEqual(['chrome120', 'firefox115']);
    });

    it('preserves an explicit fallback target when there is no override', () => {
      expect(getBrowserTargets({ env: {}, defaultTargets: 'es2022' })).toBe('es2022');
    });
  });
});
