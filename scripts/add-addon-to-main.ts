import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type CliOptions = {
  addon: string;
  filePath: string;
};

const DEFAULT_MAIN_FILE = resolve(process.cwd(), 'code/.storybook/main.ts');

function parseArgs(argv: string[]): CliOptions {
  let addon = '';
  let filePath = DEFAULT_MAIN_FILE;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];

    if (argument === '--addon' || argument === '-a') {
      addon = value ?? '';
      index += 1;
      continue;
    }

    if (argument === '--file' || argument === '-f') {
      filePath = resolve(process.cwd(), value ?? '');
      index += 1;
      continue;
    }

    if (argument === '--help' || argument === '-h') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!addon) {
    throw new Error('Missing required --addon argument.');
  }

  return { addon, filePath };
}

function printUsage() {
  console.log(
    [
      'Usage:',
      '  node ./scripts/add-addon-to-main.ts --addon @storybook/addon-interactions',
      '  node ./scripts/add-addon-to-main.ts --addon @storybook/addon-interactions --file ./code/.storybook/main.ts',
    ].join('\n')
  );
}

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findClosingBracket(source: string, openingBracketIndex: number) {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateString = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = openingBracketIndex; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];
    const previousCharacter = source[index - 1];

    if (inLineComment) {
      if (character === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (character === '*' && nextCharacter === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inSingleQuote) {
      if (character === '\'' && previousCharacter !== '\\') {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      if (character === '"' && previousCharacter !== '\\') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (inTemplateString) {
      if (character === '`' && previousCharacter !== '\\') {
        inTemplateString = false;
      }
      continue;
    }

    if (character === '/' && nextCharacter === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (character === '/' && nextCharacter === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (character === '\'') {
      inSingleQuote = true;
      continue;
    }

    if (character === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (character === '`') {
      inTemplateString = true;
      continue;
    }

    if (character === '[') {
      depth += 1;
      continue;
    }

    if (character === ']') {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error('Unable to find the end of the addons array.');
}

function getAddonsArrayRange(source: string) {
  const addonsMatch = /addons\s*:\s*\[/.exec(source);

  if (!addonsMatch) {
    throw new Error('Unable to locate the addons array.');
  }

  const openingBracketIndex = source.indexOf('[', addonsMatch.index);
  const closingBracketIndex = findClosingBracket(source, openingBracketIndex);

  return { openingBracketIndex, closingBracketIndex };
}

export function addAddonToSource(source: string, addon: string) {
  const { openingBracketIndex, closingBracketIndex } = getAddonsArrayRange(source);
  const arrayContent = source.slice(openingBracketIndex + 1, closingBracketIndex);
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const addonPattern = new RegExp(`(["'])${escapeForRegex(addon)}\\1`);

  if (addonPattern.test(arrayContent)) {
    return { nextSource: source, changed: false };
  }

  const anchorMatch = /^(\s*)(["'])\.\/services-preset\.ts\2,?/m.exec(arrayContent);

  if (!anchorMatch || anchorMatch.index === undefined) {
    throw new Error("Unable to find './services-preset.ts' in the addons array.");
  }

  const indentation = anchorMatch[1];
  const quote = anchorMatch[2];
  const insertion = `${indentation}${quote}${addon}${quote},${newline}`;
  const nextArrayContent =
    arrayContent.slice(0, anchorMatch.index) + insertion + arrayContent.slice(anchorMatch.index);
  const nextSource =
    source.slice(0, openingBracketIndex + 1) + nextArrayContent + source.slice(closingBracketIndex);

  return { nextSource, changed: true };
}

async function run() {
  const { addon, filePath } = parseArgs(process.argv.slice(2));
  const source = await readFile(filePath, 'utf8');
  const { nextSource, changed } = addAddonToSource(source, addon);

  if (!changed) {
    console.log(`Addon already exists: ${addon}`);
    return;
  }

  await writeFile(filePath, nextSource, 'utf8');
  console.log(`Added ${addon} to ${filePath}`);
}

run().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
});
