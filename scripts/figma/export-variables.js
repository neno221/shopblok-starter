// Figma kit export (M1 plan, T18; D24, D25). Read-only Figma plugin-API code.
//
// Run it through the Figma connector's `use_figma` tool on the kit's file
// (https://www.figma.com/design/1PUSIlNviAwiZT0praTxES), or as a development
// plugin in the Figma desktop app. It calls no setter and creates, changes or
// deletes nothing. It returns the kit's local variables and its local text and
// effect styles, already normalised as D25 says:
//   - collections, variables and styles sorted by name, object keys sorted;
//   - a collection's modes keep Figma's order (the first is the default);
//   - aliases written as "<collection>/<variable name>", never as ids;
//   - colours as #rrggbb, or #rrggbbaa when alpha < 1;
//   - floats rounded to 4 decimals (Figma stores float32, so 0.1 reads as
//     0.10000000149011612);
//   - no ids, no keys and no timestamps.
//
// `use_figma` returns at most 20 480 bytes, and the whole export is about ten
// times that, so one run returns one slice of the serialised export: run it
// with PAGE = 0, 1, 2 … until `offset + chunk.length === length`. The
// connector also allows only about ten calls a minute, and a refused call
// says "truncated to 20kb" whatever its size, so pause a minute after every
// few slices. Every slice carries its offset, the length and an
// FNV-1a hash of the whole text; scripts/figma/assemble.mjs joins the slices,
// checks both, and writes packages/ui/tokens/figma.tokens.json.
const PAGE = 0;
const PAGE_SIZE = 14000;
const FILE_KEY = "1PUSIlNviAwiZT0praTxES";

const round = (n) => Math.round(n * 1e4) / 1e4;
const hex2 = (c) =>
  Math.round(c * 255)
    .toString(16)
    .padStart(2, "0");
const hex = (c) =>
  "#" +
  hex2(c.r) +
  hex2(c.g) +
  hex2(c.b) +
  ("a" in c && c.a < 1 ? hex2(c.a) : "");

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      if (value[k] !== undefined) out[k] = sortKeys(value[k]);
    }
    return out;
  }
  return value;
}

const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

const collectionNames = new Map();
async function collectionName(id) {
  if (!collectionNames.has(id)) {
    const c = await figma.variables.getVariableCollectionByIdAsync(id);
    collectionNames.set(id, c ? c.name : "?");
  }
  return collectionNames.get(id);
}

const aliasNames = new Map();
async function aliasName(id) {
  if (!aliasNames.has(id)) {
    const v = await figma.variables.getVariableByIdAsync(id);
    aliasNames.set(
      id,
      v
        ? (await collectionName(v.variableCollectionId)) + "/" + v.name
        : "?missing",
    );
  }
  return aliasNames.get(id);
}

async function value(v) {
  if (v && typeof v === "object" && v.type === "VARIABLE_ALIAS") {
    return { alias: await aliasName(v.id) };
  }
  if (v && typeof v === "object" && "r" in v) return hex(v);
  if (typeof v === "number") return round(v);
  return v;
}

async function bound(boundVariables) {
  if (!boundVariables) return undefined;
  const out = {};
  for (const [field, b] of Object.entries(boundVariables)) {
    if (b && b.type === "VARIABLE_ALIAS") out[field] = await aliasName(b.id);
  }
  return Object.keys(out).length ? out : undefined;
}

async function exportCollection(c) {
  const modes = c.modes.map((m) => m.name);
  const vars = [];
  for (const id of c.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (!v) continue;
    const values = {};
    for (const m of c.modes)
      values[m.name] = await value(v.valuesByMode[m.modeId]);
    vars.push({
      name: v.name,
      type: v.resolvedType,
      scopes: [...v.scopes].sort(),
      codeSyntax: v.codeSyntax,
      description: v.description,
      hiddenFromPublishing: v.hiddenFromPublishing,
      values,
    });
  }
  vars.sort(byName);
  return {
    name: c.name,
    modes,
    defaultMode: c.modes.find((m) => m.modeId === c.defaultModeId).name,
    hiddenFromPublishing: c.hiddenFromPublishing,
    variableCount: vars.length,
    variables: vars,
  };
}

const lh = (l) =>
  l.unit === "AUTO"
    ? { unit: "AUTO" }
    : { unit: l.unit, value: round(l.value) };

async function exportStyles() {
  const text = [];
  for (const s of await figma.getLocalTextStylesAsync()) {
    text.push({
      name: s.name,
      description: s.description,
      fontFamily: s.fontName.family,
      fontStyle: s.fontName.style,
      fontSize: round(s.fontSize),
      lineHeight: lh(s.lineHeight),
      letterSpacing: {
        unit: s.letterSpacing.unit,
        value: round(s.letterSpacing.value),
      },
      paragraphSpacing: round(s.paragraphSpacing),
      paragraphIndent: round(s.paragraphIndent),
      textCase: s.textCase,
      textDecoration: s.textDecoration,
      boundVariables: await bound(s.boundVariables),
    });
  }
  const effect = [];
  for (const s of await figma.getLocalEffectStylesAsync()) {
    const effects = [];
    for (const e of s.effects) {
      effects.push({
        type: e.type,
        visible: e.visible,
        blendMode: e.blendMode,
        color: e.color ? hex(e.color) : undefined,
        offset: e.offset
          ? { x: round(e.offset.x), y: round(e.offset.y) }
          : undefined,
        radius: round(e.radius),
        spread: e.spread !== undefined ? round(e.spread) : undefined,
        showShadowBehindNode: e.showShadowBehindNode,
        boundVariables: await bound(e.boundVariables),
      });
    }
    effect.push({ name: s.name, description: s.description, effects });
  }
  return { text: text.sort(byName), effect: effect.sort(byName) };
}

const collections = (
  await figma.variables.getLocalVariableCollectionsAsync()
).sort(byName);
const out = {
  source: {
    fileKey: FILE_KEY,
    fileName: figma.root.name,
    code: "scripts/figma/export-variables.js",
  },
};
out.styles = await exportStyles();
out.collections = [];
for (const c of collections) out.collections.push(await exportCollection(c));

const text = JSON.stringify(sortKeys(out));
let hash = 0x811c9dc5;
for (let i = 0; i < text.length; i++) {
  hash ^= text.charCodeAt(i);
  hash = Math.imul(hash, 0x01000193) >>> 0;
}
return {
  page: PAGE,
  offset: PAGE * PAGE_SIZE,
  pages: Math.ceil(text.length / PAGE_SIZE),
  length: text.length,
  fnv1a: hash.toString(16).padStart(8, "0"),
  variableCount: out.collections.reduce((n, c) => n + c.variableCount, 0),
  chunk: text.slice(PAGE * PAGE_SIZE, (PAGE + 1) * PAGE_SIZE),
};
