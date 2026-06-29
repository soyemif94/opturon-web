import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const wizard = read("components/app/CatalogImportWizard.tsx");

assert.match(wizard, /GUIDED_STAGE_LABELS = \["Subir archivo", "Revisar productos", "Confirmar importación"\]/);
assert.match(wizard, /STEP_LABELS = \["Archivo", "Hoja y formato", "Mapeo", "Vista previa", "Confirmación", "Resultado"\]/);
assert.match(wizard, /function getGuidedStage\(step: Step\)/);
assert.match(wizard, /stageNumber === 1 \? \(file \? 2 : 1\) : stageNumber === 2 \? 4 : 5/);

assert.match(wizard, /Importar productos/);
assert.match(wizard, /Subí tu archivo y Opturon preparará los productos por vos\. Nada se guardará hasta que confirmes\./);
assert.doesNotMatch(wizard, /Importación masiva de catálogo/);
assert.doesNotMatch(wizard, /Actualizar vista previa/);
assert.doesNotMatch(wizard, /Mapeo manual/);
assert.doesNotMatch(wizard, /Primeras filas normalizadas/);

assert.match(wizard, /function CategoryRecommendationCard/);
assert.match(wizard, /✓ Recomendado/);
assert.match(wizard, /Crear las categorías automáticamente/);
assert.match(wizard, /Las crearemos recién cuando confirmes\./);
assert.match(wizard, /expanded \? \(/);
assert.match(wizard, /Cambiar configuración/);

assert.match(wizard, /Columnas detectadas|Columnas del archivo/);
assert.match(wizard, /mappedColumns/);
assert.match(wizard, /reviewColumns/);
assert.match(wizard, /columnExamples/);
assert.match(wizard, /Revisar columnas/);
assert.match(wizard, /showColumnMapping \|\| reviewColumns\.length/);
assert.match(wizard, /todavía no tiene un destino/);
assert.match(wizard, /Todo fue reconocido correctamente/);

assert.match(wizard, /✓ Tu archivo está listo/);
assert.match(wizard, /readyRowsLabel/);
assert.match(wizard, /Todavía no hicimos ningún cambio/);
assert.match(wizard, /Revisar \$\{stats\.errorRows\} productos con problemas/);
assert.match(wizard, /Continuar con \{stats\?\.validRows \|\| 0\} productos/);

assert.match(wizard, /function AdvancedOptionsShell/);
assert.match(wizard, /Opciones avanzadas/);
assert.match(wizard, /aria-expanded=\{expanded\}/);
assert.match(wizard, /focus:ring-2 focus:ring-amber-300\/30/);
assert.match(wizard, /sticky bottom-0 z-20/);
assert.match(wizard, /min-h-11/);
assert.match(wizard, /md:grid-cols-3/);
assert.match(wizard, /lg:grid-cols/);

console.log("catalog-import-guided-ux.test.ts passed");
