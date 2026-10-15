// Figma kit export (M1 plan, T18; D24, D25). Read-only Figma plugin-API code.
//
// Run it through the Figma connector's `use_figma` tool on the kit's file
// (https://www.figma.com/design/1PUSIlNviAwiZT0praTxES), or as a development
// plugin in the Figma desktop app. It calls no setter and creates, changes or
// deletes nothing. It returns the kit's local variables and its local text and
// effect styles, already normalised as D25 says:
//   - collections, variables and styles sorted by name (styles that share a
//     name by their content), object keys sorted;
//   - a collection's modes keep Figma's order (the first is the default);
//   - aliases written as { alias: "<collection>/<variable name>" }, never as
//     ids, with `remote: true` when the variable comes from another library,
//     and `unlisted: true` when it is a variable of this file that its
//     collection no longer lists (so it isn't in the export; the kit's effect
//     styles still use 50 of these);
//   - a reference to a variable Figma can't find stops the export with an
//     error, rather than writing a placeholder;
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
// FNV-1a hash of the whole text; scripts/figma/assemble.ts joins the slices,
// checks both, and writes packages/ui/tokens/figma.tokens.json. A slice never
// ends between the two halves of a surrogate pair.
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

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byName = (a, b) => cmp(a.name, b.name);
// Three of the kit's text styles share their name with another; their content
// keeps the order the same from one export to the next.
const byNameThenContent = (a, b) =>
  byName(a, b) || cmp(JSON.stringify(sortKeys(a)), JSON.stringify(sortKeys(b)));

const collectionsById = new Map();
async function collection(id) {
  if (!collectionsById.has(id)) {
    const c = await figma.variables.getVariableCollectionByIdAsync(id);
    if (!c) throw new Error(`variable collection ${id} not found`);
    collectionsById.set(id, { name: c.name, ids: new Set(c.variableIds) });
  }
  return collectionsById.get(id);
}

const aliases = new Map();
async function alias(id, where) {
  if (!aliases.has(id)) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (!v) throw new Error(`${where} refers to variable ${id}, not found`);
    const c = await collection(v.variableCollectionId);
    aliases.set(id, {
      alias: c.name + "/" + v.name,
      remote: v.remote || undefined,
      unlisted: !v.remote && !c.ids.has(id) ? true : undefined,
    });
  }
  return aliases.get(id);
}

async function value(v, where) {
  if (v && typeof v === "object" && v.type === "VARIABLE_ALIAS") {
    return alias(v.id, where);
  }
  if (v && typeof v === "object" && "r" in v) return hex(v);
  if (typeof v === "number") return round(v);
  return v;
}

async function bound(boundVariables, where) {
  if (!boundVariables) return undefined;
  const out = {};
  for (const [field, b] of Object.entries(boundVariables)) {
    if (b && b.type === "VARIABLE_ALIAS") {
      out[field] = await alias(b.id, `${where}, ${field}`);
    }
  }
  return Object.keys(out).length ? out : undefined;
}

async function exportCollection(c) {
  const modes = c.modes.map((m) => m.name);
  const vars = [];
  for (const id of c.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (!v)
      throw new Error(`collection ${c.name} lists variable ${id}, not found`);
    const values = {};
    for (const m of c.modes) {
      const where = `${c.name}/${v.name} (${m.name})`;
      values[m.name] = await value(v.valuesByMode[m.modeId], where);
    }
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
      boundVariables: await bound(s.boundVariables, `text style ${s.name}`),
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
        radius: e.radius !== undefined ? round(e.radius) : undefined,
        spread: e.spread !== undefined ? round(e.spread) : undefined,
        showShadowBehindNode: e.showShadowBehindNode,
        boundVariables: await bound(e.boundVariables, `effect style ${s.name}`),
      });
    }
    effect.push({ name: s.name, description: s.description, effects });
  }
  return {
    text: text.sort(byNameThenContent),
    effect: effect.sort(byNameThenContent),
  };
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
// Moves a boundary that falls inside a surrogate pair one place on.
const boundary = (i) =>
  i > 0 && i < text.length && /[\uD800-\uDBFF]/.test(text[i - 1]) ? i + 1 : i;
const start = boundary(PAGE * PAGE_SIZE);
const end = boundary((PAGE + 1) * PAGE_SIZE);
return {
  page: PAGE,
  offset: start,
  pages: Math.ceil(text.length / PAGE_SIZE),
  length: text.length,
  fnv1a: hash.toString(16).padStart(8, "0"),
  variableCount: out.collections.reduce((n, c) => n + c.variableCount, 0),
  chunk: text.slice(start, end),
};
