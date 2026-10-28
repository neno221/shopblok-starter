import * as migration_20261009_115513_initial from "./20261009_115513_initial";
import * as migration_20261026_174226_market_time_zones from "./20261026_174226_market_time_zones";
import * as migration_20261028_154553_localized_parent_id_indexes from "./20261028_154553_localized_parent_id_indexes";

export const migrations = [
  {
    up: migration_20261009_115513_initial.up,
    down: migration_20261009_115513_initial.down,
    name: "20261009_115513_initial",
  },
  {
    up: migration_20261026_174226_market_time_zones.up,
    down: migration_20261026_174226_market_time_zones.down,
    name: "20261026_174226_market_time_zones",
  },
  {
    up: migration_20261028_154553_localized_parent_id_indexes.up,
    down: migration_20261028_154553_localized_parent_id_indexes.down,
    name: "20261028_154553_localized_parent_id_indexes",
  },
];
