import * as migration_20261009_115513_initial from "./20261009_115513_initial";
import * as migration_20261026_174226_market_time_zones from "./20261026_174226_market_time_zones";

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
];
