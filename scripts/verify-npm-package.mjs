/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {execFileSync} from 'node:child_process';
import {statSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function runNpm(args) {
  const npmExecPath = process.env['npm_execpath'];
  if (!npmExecPath) {
    throw new Error(
      'npm_execpath is unavailable; run this verifier through npm run verify-npm-package.',
    );
  }

  return execFileSync(process.execPath, [npmExecPath, ...args], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
}

// Checks that select build files are present in an existing tarball or the
// tarball npm would create from the current working directory.
function verifyPackageContents() {
  const packageSpec = path.resolve(process.argv[2] ?? process.cwd());
  try {
    const packageStat = statSync(packageSpec);
    if (!packageStat.isDirectory() && !packageStat.isFile()) {
      throw new Error('Package path must be a local directory or tarball.');
    }

    const output = runNpm([
      'pack',
      packageSpec,
      '--dry-run',
      '--json',
      '--silent',
      '--ignore-scripts',
      '--offline',
    ]);
    const parsedOutput = JSON.parse(output);
    const packResults = Array.isArray(parsedOutput)
      ? parsedOutput
      : Object.values(parsedOutput);
    if (packResults.length !== 1) {
      throw new Error(
        `Expected one npm pack result, received ${packResults.length}.`,
      );
    }
    const [packResult] = packResults;
    if (!packResult || !Array.isArray(packResult.files)) {
      throw new Error('npm pack output did not include a files array.');
    }
    const files = packResult.files.map(file => file.path);
    // Check some important files.
    const requiredPaths = [
      'build/src/index.js',
      'build/src/third_party/index.js',
    ];
    for (const requiredPath of requiredPaths) {
      if (!files.includes(requiredPath)) {
        console.error(
          `Assertion Failed: "${requiredPath}" not found in tarball.`,
        );
        process.exit(1);
      }
    }
    console.log(
      `Verified ${packageSpec} contains ${JSON.stringify(requiredPaths)}`,
    );
  } catch (err) {
    console.error(`Failed to inspect npm package "${packageSpec}".`, err);
    process.exit(1);
  }
}

verifyPackageContents();
