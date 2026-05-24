"use strict";

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Asset = require('../src/models/Asset');

dotenv.config();

const trimString = value => (typeof value === 'string' ? value.trim() : '');

const run = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined');
  }

  await mongoose.connect(mongoUri);

  const assets = await Asset.find({
    $or: [
      { section: { $exists: false } },
      { section: { $in: [null, ''] } },
      { category: { $exists: true, $nin: [null, ''] } },
      { location: { $exists: true, $nin: [null, ''] } },
    ],
  });

  let migrated = 0;

  for (const asset of assets) {
    const section =
      trimString(asset.section)
      || trimString(asset.category)
      || trimString(asset.location);

    if (!section) {
      continue;
    }

    const verificationHistory = Array.isArray(asset.verificationHistory)
      ? asset.verificationHistory.map(entry => {
          const nextEntry = entry.toObject ? entry.toObject() : { ...entry };
          if (!nextEntry.section && nextEntry.location) {
            nextEntry.section = nextEntry.location;
          }
          delete nextEntry.location;
          return nextEntry;
        })
      : undefined;

    const update = {
      $set: { section },
      $unset: {
        category: '',
        location: '',
      },
    };

    if (verificationHistory) {
      update.$set.verificationHistory = verificationHistory;
    }

    await Asset.updateOne(
      { _id: asset._id },
      update,
    );
    migrated += 1;
  }

  console.log(`Migrated ${migrated} asset(s) to section.`);
};

run()
  .catch(error => {
    console.error('Asset section migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
