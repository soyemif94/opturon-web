import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const wizard = read("components/app/CatalogImportWizard.tsx");
const apiTypes = read("lib/api.ts");

assert.match(wizard, /useState<"reject_missing" \| "create_missing">\("create_missing"\)/);
assert.match(wizard, /function CategoryRecommendationCard/);
assert.match(wizard, /function CategoryPolicyPanel/);
assert.match(wizard, /Categorías inexistentes/);
assert.match(wizard, /Marcarlas como error/);
assert.match(wizard, /Crearlas al confirmar/);
assert.match(wizard, /La categoría se mostrará en la vista previa, pero recién se creará cuando confirmes la importación\./);
assert.match(wizard, /Cambiar configuración/);
assert.match(wizard, /Crear categorías automáticamente/);
assert.match(wizard, /formData\.append\("categoryPolicy", nextCategoryPolicy\)/);
assert.match(wizard, /runAnalyze\(targetStep, \{ categoryPolicy: nextPolicy \}\)/);
assert.match(wizard, /categoryPendingCreation/);
assert.match(wizard, /Categoría nueva/);
assert.match(wizard, /Se creará al confirmar\./);
assert.match(wizard, /Categorías nuevas: \{stats\?\.newCategories \|\| 0\}/);
assert.match(wizard, /Categorías faltantes: <span className="font-semibold text-white">\{labelForCategoryPolicy\(categoryPolicy\)\}<\/span>/);
assert.match(wizard, /labelForCategoryPolicy/);

assert.match(wizard, /function DarkSelect/);
assert.match(wizard, /\[color-scheme:dark\]/);
assert.match(wizard, /\[&>option\]:bg-slate-950/);
assert.match(wizard, /function DarkOption/);
assert.match(wizard, /SELECT_OPTION_CLASS_NAME = "bg-slate-950 text-slate-100"/);
assert.doesNotMatch(wizard, /<option value=/);
assert.match(wizard, /focus:border-amber-300\/60/);
assert.match(wizard, /disabled:bg-slate-900\/70/);
assert.match(wizard, /md:grid-cols-2/);

assert.match(apiTypes, /newCategories\?: number/);

console.log("catalog-import-category-policy-ui.test.ts passed");
