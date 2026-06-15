export {};

declare const process: {
  env: Record<string, string | undefined>;
};

const { afterEach, describe, expect, it, vi } = (await new Function(
  'return import("vitest")'
)()) as {
  afterEach: (fn: () => void | Promise<void>) => void;
  describe: (name: string, fn: () => void | Promise<void>) => void;
  expect: any;
  it: ((name: string, fn: () => void | Promise<void>) => void) & {
    each: <T>(items: readonly T[]) => (
      name: string,
      fn: (item: T) => void | Promise<void>
    ) => void;
  };
  vi: {
    mock: (...args: any[]) => void;
    fn: <T extends (...args: any[]) => any>(fn?: T) => T;
    resetModules: () => void;
  };
};

const reactPlugin = { name: 'mock-react-plugin' };
const configTypes = ['DEVELOPMENT', 'PRODUCTION'] as const;

vi.mock('@storybook/react-vite/node', () => ({
  defineMain: <T>(config: T) => config,
}));

vi.mock('@vitejs/plugin-react', () => ({
  default: vi.fn(() => reactPlugin),
}));

const originalCI = process.env.CI;

const loadViteFinal = async () => {
  const { default: mainConfig } = await import('../../../.storybook/main.ts');

  return mainConfig.viteFinal!;
};

const runViteFinal = async (configType: 'DEVELOPMENT' | 'PRODUCTION', ci?: string) => {
  if (ci === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = ci;
  }

  const viteFinal = await loadViteFinal();
  return viteFinal({}, { configType } as never);
};

afterEach(() => {
  if (originalCI === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = originalCI;
  }

  vi.resetModules();
});

describe('viteFinal example', () => {
  it('adds development-only aliases in DEVELOPMENT mode', async () => {
    const config = await runViteFinal('DEVELOPMENT');
    const alias = config.resolve?.alias as Record<string, string>;

    expect(alias['storybook/manager-api']).toContain('/core/src/manager-api/index.mock.ts');
    expect(alias['storybook/internal/components']).toContain('/core/src/components/index.ts');
    expect(alias['storybook/theming']).toContain('/core/src/theming/index.ts');
    expect(alias['storybook/theming/create']).toContain('/core/src/theming/create.ts');
    expect(alias['sb-original/image-context']).toContain('/frameworks/nextjs/src/image-context.ts');
  });

  it('does not add development-only aliases in PRODUCTION mode', async () => {
    const config = await runViteFinal('PRODUCTION');
    const alias = config.resolve?.alias as Record<string, string>;

    expect(alias['storybook/manager-api']).toContain('/core/src/manager-api/index.mock.ts');
    expect(alias).not.toHaveProperty('storybook/internal/components');
    expect(alias).not.toHaveProperty('storybook/theming');
    expect(alias).not.toHaveProperty('storybook/theming/create');
    expect(alias).not.toHaveProperty('sb-original/image-context');
  });

  it.each(configTypes)(
    'sets build.sourcemap to true when CI is not true in %s mode',
    async (configType: (typeof configTypes)[number]) => {
      const config = await runViteFinal(configType);

      expect(config.build?.sourcemap).toBe(true);
    }
  );

  it.each(configTypes)(
    'sets build.sourcemap to false when CI=true in %s mode',
    async (configType: (typeof configTypes)[number]) => {
      const config = await runViteFinal(configType, 'true');

      expect(config.build?.sourcemap).toBe(false);
    }
  );
});
