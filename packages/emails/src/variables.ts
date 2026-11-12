const VARIABLE = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;

/**
 * `{{name}}` replaced by its value for each name in `allowed`; any other `{{…}}` stays as it is
 * written. One pass, so a value that itself contains `{{…}}` is not filled again. The values go in
 * as they are, as text: whatever turns the result into HTML escapes it there, once (T70's PR 92
 * review, item 1; D121: React, since a variable is a text node).
 */
export function fillVariables(
  text: string,
  allowed: readonly string[],
  values: Readonly<Record<string, string | undefined>>,
): string {
  return text.replace(VARIABLE, (match, name: string) => {
    const value = allowed.includes(name) ? values[name] : undefined;
    return value ?? match;
  });
}
