# Third-party notices

`@shopblok/ui` contains or builds on the works below. The atoms in `src/atoms/` that came from a
registry keep a header naming their source, style and date, and have been edited for this repository
(SETUP.md, "shadcn and ReUI (T21)").

## shadcn/ui — MIT

The atoms vendored with `shadcn add` (style `base-vega`, CLI 4.21.4, 2026-10-16): avatar, badge,
button, checkbox, input, kbd, label, native-select, progress, radio-group, select, separator,
skeleton, spinner, switch, textarea, tooltip. `cn` (the class merger they import, through
`src/lib/utils.ts`) is shadcn's npm package of the same name, MIT, copyright (c) 2026 shadcn.

```
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Base UI — MIT

`@base-ui/react` (npm), the primitives under the atoms. Copyright (c) 2019 Material-UI SAS, MIT.

## ReUI — MIT

The registry items `rating` and `number-field` (T23) come from ReUI's public registry
(`https://reui.io/r/{style}/{name}.json`), whose items ReUI's licence (updated 2026-09-28) puts under
MIT with this notice kept. ReUI's Pro blocks, templates and icons are not used.

## Lucide — ISC

`lucide-react` (npm), the icons the atoms draw. Some of its icons derive from Feather (MIT, Cole
Bemis); the package's own `LICENSE` lists them and carries Feather's notice.

```
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## The design kit — CC BY 4.0

The tokens (`tokens/figma.tokens.json` and what is generated from it) and the atoms' look are adapted
from "shadcn/ui – Design System by ReUI", a Figma Community file by ReUI
(<https://www.figma.com/community/file/1649373313065184861/shadcn-ui-design-system-by-reui>), licensed
under CC BY 4.0 (<https://creativecommons.org/licenses/by/4.0/>). Changes: the colours the build's
contrast gate rejects, the commerce tokens, and the atoms' sizes, rings and directions listed in
SETUP.md.
