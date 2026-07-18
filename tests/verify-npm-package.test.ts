/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {afterEach, describe, it} from 'node:test';

const verifierPath = path.join(
  process.cwd(),
  'scripts',
  'verify-npm-package.mjs',
);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  for (const temporaryDirectory of temporaryDirectories.splice(0)) {
    await fs.rm(temporaryDirectory, {recursive: true, force: true});
  }
});

async function createPackageTarball(
  thirdPartyEntry = 'index.js',
): Promise<string> {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'verify npm package-'),
  );
  temporaryDirectories.push(temporaryDirectory);

  const packageDirectory = path.join(temporaryDirectory, 'package');
  const outputDirectory = path.join(temporaryDirectory, 'output');
  await fs.mkdir(path.join(packageDirectory, 'build', 'src', 'third_party'), {
    recursive: true,
  });
  await fs.mkdir(outputDirectory);
  await fs.writeFile(
    path.join(packageDirectory, 'package.json'),
    JSON.stringify({
      name: 'verify-npm-package-fixture',
      version: '1.0.0',
      files: ['build'],
    }),
  );
  await fs.writeFile(
    path.join(packageDirectory, 'build', 'src', 'index.js'),
    'export {};\n',
  );
  await fs.writeFile(
    path.join(packageDirectory, 'build', 'src', 'third_party', thirdPartyEntry),
    'export {};\n',
  );

  const npmExecPath = process.env['npm_execpath'];
  assert.ok(npmExecPath, 'npm_execpath must be set when running tests');
  const result = spawnSync(
    process.execPath,
    [
      npmExecPath,
      'pack',
      packageDirectory,
      '--pack-destination',
      outputDirectory,
      '--json',
      '--silent',
      '--ignore-scripts',
    ],
    {encoding: 'utf8'},
  );
  assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);

  const [packResult] = JSON.parse(result.stdout);
  return path.join(outputDirectory, packResult.filename);
}

describe('npm package verifier', () => {
  it('accepts a valid local tarball without registry access', async () => {
    const tarballPath = await createPackageTarball();
    const result = spawnSync(process.execPath, [verifierPath, tarballPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {...process.env, npm_config_offline: 'true'},
    });

    assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  });

  it('rejects a tarball when an exact required path is missing', async () => {
    const tarballPath = await createPackageTarball('index.js.backup');
    const result = spawnSync(process.execPath, [verifierPath, tarballPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {...process.env, npm_config_offline: 'true'},
    });

    assert.strictEqual(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(
      result.stderr,
      /Assertion Failed: "build\/src\/third_party\/index\.js" not found in tarball\./,
    );
  });

  it('rejects a corrupt local tarball without registry access', async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'verify npm package-'),
    );
    temporaryDirectories.push(temporaryDirectory);
    const tarballPath = path.join(temporaryDirectory, 'corrupt package.tgz');
    await fs.writeFile(tarballPath, 'not a tarball');

    const result = spawnSync(process.execPath, [verifierPath, tarballPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {...process.env, npm_config_offline: 'true'},
    });

    assert.strictEqual(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /Failed to inspect npm package/);
  });

  it('rejects package names instead of resolving them through a registry', () => {
    const result = spawnSync(
      process.execPath,
      [verifierPath, 'definitely-not-a-local-package-path'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {...process.env, npm_config_offline: 'true'},
      },
    );

    assert.strictEqual(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /ENOENT/);
  });
});

describe('Alfheim release workflow', () => {
  it('verifies and publishes the exact same tarball', async () => {
    const workflow = await fs.readFile(
      path.join(
        process.cwd(),
        '.github',
        'workflows',
        'alfheim-publish-release.yml',
      ),
      'utf8',
    );
    const artifactReference = '${{ steps.package.outputs.artifact }}';

    assert.match(workflow, /id: package/);
    assert.match(
      workflow,
      /name: Verify distributable package[\s\S]*?PACKAGE_ARTIFACT: \$\{\{ steps\.package\.outputs\.artifact \}\}[\s\S]*?npm run verify-npm-package -- "\$\{PACKAGE_ARTIFACT\}"/,
    );
    assert.match(
      workflow,
      /name: Publish GitHub release[\s\S]*?PACKAGE_ARTIFACT: \$\{\{ steps\.package\.outputs\.artifact \}\}[\s\S]*?asset="\$\{PACKAGE_ARTIFACT\}"/,
    );
    assert.strictEqual(workflow.split(artifactReference).length - 1, 2);
  });
});
