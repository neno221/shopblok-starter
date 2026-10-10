import * as migration_20261009_115513_initial from './20261009_115513_initial';
import * as migration_20261010_091441_s1_hero_image from './20261010_091441_s1_hero_image';

export const migrations = [
  {
    up: migration_20261009_115513_initial.up,
    down: migration_20261009_115513_initial.down,
    name: '20261009_115513_initial',
  },
  {
    up: migration_20261010_091441_s1_hero_image.up,
    down: migration_20261010_091441_s1_hero_image.down,
    name: '20261010_091441_s1_hero_image'
  },
];
