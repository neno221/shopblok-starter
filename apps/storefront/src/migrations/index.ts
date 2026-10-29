import * as migration_20261009_115513_initial from "./20261009_115513_initial";
import * as migration_20261026_174226_market_time_zones from "./20261026_174226_market_time_zones";
import * as migration_20261028_154553_localized_parent_id_indexes from "./20261028_154553_localized_parent_id_indexes";
import * as migration_20261028_164715_cms_foundations from "./20261028_164715_cms_foundations";
import * as migration_20261028_194034_sync from "./20261028_194034_sync";
import * as migration_20261028_211336_email_templates from "./20261028_211336_email_templates";
import * as migration_20261028_220728_ui_strings from "./20261028_220728_ui_strings";
import * as migration_20261029_000652_globals from "./20261029_000652_globals";
import * as migration_20261029_020305_blocks from "./20261029_020305_blocks";
import * as migration_20261029_032810_forms from "./20261029_032810_forms";

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
  {
    up: migration_20261028_164715_cms_foundations.up,
    down: migration_20261028_164715_cms_foundations.down,
    name: "20261028_164715_cms_foundations",
  },
  {
    up: migration_20261028_194034_sync.up,
    down: migration_20261028_194034_sync.down,
    name: "20261028_194034_sync",
  },
  {
    up: migration_20261028_211336_email_templates.up,
    down: migration_20261028_211336_email_templates.down,
    name: "20261028_211336_email_templates",
  },
  {
    up: migration_20261028_220728_ui_strings.up,
    down: migration_20261028_220728_ui_strings.down,
    name: "20261028_220728_ui_strings",
  },
  {
    up: migration_20261029_000652_globals.up,
    down: migration_20261029_000652_globals.down,
    name: "20261029_000652_globals",
  },
  {
    up: migration_20261029_020305_blocks.up,
    down: migration_20261029_020305_blocks.down,
    name: "20261029_020305_blocks",
  },
  {
    up: migration_20261029_032810_forms.up,
    down: migration_20261029_032810_forms.down,
    name: "20261029_032810_forms",
  },
];
