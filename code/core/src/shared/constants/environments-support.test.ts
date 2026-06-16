import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BROWSER_TARGETS,
  BROWSER_TARGETS_ENV_KEY,
  getBrowserTargets,
  isValidBrowserTarget,
  parseBrowserTargets,
} from './environments-support.ts';

describe('environments-support', () => {
  afterEach(() => {
    delete process.env[BROWSER_TARGETS_ENV_KEY];
  });

  describe('isValidBrowserTarget', () => {
    it.each([
      ['chrome100', true],
      ['edge134', true],
      ['firefox136', true],
      ['safari18', true],
      ['safari18.3', true],
      ['ios18.3', true],
      ['opera117', true],
      ['ie11', true],
      ['node22', true],
      ['es2020', true],
      ['esnext', false],
      ['', false],
      ['chrome', false],
      ['100', false],
      ['chrome_100', false],
    ])('returns %s for "%s"', (input, expected) => {
      expect(isValidBrowserTarget(input)).toBe(expected);
    });

    it('acts as a type guard', () => {
      const value: string = 'chrome100';
      if (isValidBrowserTarget(value)) {
        const _typed: string = value;
        expect(_typed).toBe(value);
      }
    });
  });

  describe('parseBrowserTargets', () => {
    it('parses a comma-separated list of valid targets', () => {
      expect(parseBrowserTargets('chrome100,edge100,firefox100')).toEqual([
        'chrome100',
        'edge100',
        'firefox100',
      ]);
    });

    it('trims whitespace around targets', () => {
      expect(parseBrowserTargets(' chrome100 , edge100 ')).toEqual([
        'chrome100',
        'edge100',
      ]);
    });

    it('ignores empty segments from trailing commas', () => {
      expect(parseBrowserTargets('chrome100,,edge100,')).toEqual([
        'chrome100',
        'edge100',
      ]);
    });

    it('throws on invalid targets', () => {
      expect(() => parseBrowserTargets('chrome100,invalid')).toThrow(
        `Invalid browser targets in ${BROWSER_TARGETS_ENV_KEY}: invalid`
      );
    });

    it('lists all invalid targets in the error message', () => {
      expect(() => parseBrowserTargets('chrome100,bad1,bad2')).toThrow(
        `Invalid browser targets in ${BROWSER_TARGETS_ENV_KEY}: bad1, bad2`
      );
    });
  });

  describe('getBrowserTargets', () => {
    it('returns BROWSER_TARGETS when no env override is set', () => {
      expect(getBrowserTargets()).toBe(BROWSER_TARGETS);
    });

    it('returns parsed override when BROWSER_TARGETS_OVERRIDE is set', () => {
      process.env[BROWSER_TARGETS_ENV_KEY] = 'chrome100,edge100';
      expect(getBrowserTargets()).toEqual(['chrome100', 'edge100']);
    });

    it('falls back to BROWSER_TARGETS when override contains invalid values', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env[BROWSER_TARGETS_ENV_KEY] = 'invalid';
      expect(getBrowserTargets()).toBe(BROWSER_TARGETS);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid browser targets')
      );
      warnSpy.mockRestore();
    });

    it('handles single target override', () => {
      process.env[BROWSER_TARGETS_ENV_KEY] = 'chrome120';
      expect(getBrowserTargets()).toEqual(['chrome120']);
    });
  });
});
