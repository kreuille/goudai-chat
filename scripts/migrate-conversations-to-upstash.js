#!/usr/bin/env node
// scripts/migrate-conversations-to-upstash.js
// =====================================================================
// Migre les conversations du filesystem VPS Ionos vers Upstash Redis.
//
// Pre-requis :
//   1. Recuperer tous les dossiers de conversations du VPS :
//      scp -r goudai-vps:/root/goudai-chat/data/conversations ./data/
//   2. Configurer .env avec UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//
// Usage :
//   node scripts/migrate-conversations-to-upstash.js [--dry-run] [--src=./data/conversations]
//
// Le script :
//   - Parcourt chaque sous-dossier de CONV_SRC (= drive_folder_id par user)
//   - Pour chaque .json : push dans Redis avec les bonnes cles + metadata
//   - Affiche un rapport (succes, erreurs, taille totale)
// =====================================================================

require('dotenv').config();
const fs   = require('fs').promises;
const path = require('path');
const { Redis } = require('@upstash/redis');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SRC = args.find(a => a.startsWith('--src='))?.split('=')[1] || './data/conversations';

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('❌ UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN requis dans .env');
  process.exit(1);
}

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const convKey  = (folderId, filename) => `conv:${folderId}:${filename}`;
const indexKey = (folderId)           => `convs-index:${folderId}`;
const metaKey  = (folderId, filename) => `convs-meta:${folderId}:${filename}`;

async function migrateFolder(folderId, folderPath) {
  const stats = { migrated: 0, skipped: 0, errors: 0, totalBytes: 0 };
  const files = (await fs.readdir(folderPath)).filter(f => f.endsWith('.json'));

  for (const filename of files) {
    const filePath = path.join(folderPath, filename);
    try {
      const stat = await fs.stat(filePath);
      const raw  = await fs.readFile(filePath, 'utf8');
      // Valide le JSON (sinon on skip — corruption probable)
      JSON.parse(raw);

      const size = stat.size;
      const modifiedTime = stat.mtime.toISOString();

      if (DRY_RUN) {
        console.log(`  [dry-run] ${folderId}/${filename} (${size} bytes, modif ${modifiedTime})`);
      } else {
        const pipeline = redis.pipeline();
        pipeline.set(convKey(folderId, filename), raw);
        pipeline.hset(metaKey(folderId, filename), { modifiedTime, size: String(size) });
        pipeline.sadd(indexKey(folderId), filename);
        await pipeline.exec();
        console.log(`  ✅ ${folderId}/${filename} (${size} bytes)`);
      }
      stats.migrated++;
      stats.totalBytes += size;
    } catch (e) {
      console.error(`  ❌ ${filename} : ${e.message}`);
      stats.errors++;
    }
  }

  return stats;
}

async function main() {
  console.log(`📦 Source : ${SRC}`);
  console.log(`🎯 Cible  : Upstash ${process.env.UPSTASH_REDIS_REST_URL.replace(/^https:\/\//, '')}`);
  console.log(`${DRY_RUN ? '🔍 Mode DRY-RUN (rien n\'est ecrit)' : '🚀 Mode LIVE (ecriture Upstash)'}`);
  console.log('');

  let folders;
  try {
    folders = await fs.readdir(SRC);
  } catch (e) {
    console.error(`❌ Impossible de lire le dossier source ${SRC} : ${e.message}`);
    process.exit(1);
  }

  const totals = { folders: 0, migrated: 0, skipped: 0, errors: 0, totalBytes: 0 };

  for (const folderId of folders) {
    const folderPath = path.join(SRC, folderId);
    const stat = await fs.stat(folderPath);
    if (!stat.isDirectory()) continue;

    console.log(`📂 ${folderId}`);
    const stats = await migrateFolder(folderId, folderPath);
    totals.folders++;
    totals.migrated  += stats.migrated;
    totals.skipped   += stats.skipped;
    totals.errors    += stats.errors;
    totals.totalBytes += stats.totalBytes;
  }

  console.log('\n=== Resume ===');
  console.log(`  Dossiers user :  ${totals.folders}`);
  console.log(`  Conversations migrees : ${totals.migrated}`);
  console.log(`  Skipped :        ${totals.skipped}`);
  console.log(`  Erreurs :        ${totals.errors}`);
  console.log(`  Volume :         ${(totals.totalBytes / 1024).toFixed(1)} KB`);
  if (DRY_RUN) console.log('\n💡 Relance sans --dry-run pour ecrire reellement dans Upstash.');
}

main().catch(e => {
  console.error('❌ Migration echouee :', e);
  process.exit(1);
});
