// The framework's own reading of a numeric text (`numbers.parseInvariant`), loaded from its source, so the filters' tests read a
// text as the runtime hands a package the rule, not a stand-in's.

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { NumberFormatting } from "ne-standard-ui";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const { numberFormatting } = await import(pathToFileURL(resolve(repository, "src/Platforms/Web/NE.Standard.UI.Web/Client/src/rendering/number-format.ts")).href) as { readonly numberFormatting: NumberFormatting };

export const readNumber = numberFormatting.parseInvariant;
