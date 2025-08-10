#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

function isImageFile(fileName) {
  return /\.(?:jpe?g|png|gif|webp)$/i.test(fileName);
}

async function readDirectoryNames(baseDir) {
  const dirents = await fs.readdir(baseDir, { withFileTypes: true });
  return dirents
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !name.startsWith('.'));
}

async function readImageFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  return dirents
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => isImageFile(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

async function writeJson(filePath, data) {
  const json = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(filePath, json, 'utf8');
}

async function generateManifests(projectRoot) {
  const imgDir = path.resolve(projectRoot, 'img');
  const exists = await fs
    .stat(imgDir)
    .then((s) => s.isDirectory())
    .catch(() => false);
  if (!exists) {
    throw new Error(`Directory not found: ${imgDir}`);
  }

  const categories = await readDirectoryNames(imgDir);
  await writeJson(path.join(imgDir, 'manifest.json'), categories);

  for (const category of categories) {
    const categoryDir = path.join(imgDir, category);
    const images = await readImageFiles(categoryDir);
    await writeJson(path.join(categoryDir, 'manifest.json'), images);
  }

  return { imgDir, categoriesCount: categories.length };
}

async function main() {
  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const { imgDir, categoriesCount } = await generateManifests(projectRoot);
  console.log(`Generated manifests under: ${imgDir}`);
  console.log(`Categories: ${categoriesCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


