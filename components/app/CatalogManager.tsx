"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";

type Product = {
  id: string;
  name: string;
  category?: string;
  sku?: string;
  price: number;
  promoPrice?: number;
  stockQty: number;
  active: boolean;
};

export function CatalogManager({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(Array.isArray(initialProducts) ? initialProducts : []);
  const [form, setForm] = useState({
    name: "",
    category: "",
    sku: "",
    price: 0,
    promoPrice: 0,
    stockQty: 0,
    description: "",
    active: true
  });
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | null; text: string }>({ tone: null, text: "" });
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({});
  const [savingStockId, setSavingStockId] = useState<string | null>(null);

  const effectiveStock = useMemo(
    () =>
      products.reduce<Record<string, number>>((acc, product) => {
        acc[product.id] = stockDrafts[product.id] ?? product.stockQty;
        return acc;
      }, {}),
    [products, stockDrafts]
  );

  async function createProduct() {
    if (!form.name.trim()) {
      setFeedback({ tone: "error", text: "El producto necesita al menos un nombre." });
      toast.error("Nombre requerido");
      return;
    }

    if (form.price < 0 || form.stockQty < 0) {
      setFeedback({ tone: "error", text: "Precio y stock no pueden ser negativos." });
      toast.error("Datos invalidos");
      return;
    }

    setIsCreating(true);
    setFeedback({ tone: null, text: "" });

    try {
      const response = await fetch("/api/app/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const json = await safeJson(response);
        const message = json?.error?.formErrors?.[0] || json?.error || "No se pudo crear el producto.";
        console.error("[app/catalog] Product create failed.", json);
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al guardar producto", String(message));
        return;
      }

      const json = await response.json();
      if (!json?.product?.id) {
        console.error("[app/catalog] Invalid product response shape.", json);
        setFeedback({ tone: "error", text: "La respuesta del servidor no devolvio un producto valido." });
        toast.error("Respuesta invalida del servidor");
        return;
      }

      setProducts((prev) => [json.product, ...prev]);
      setForm({ name: "", category: "", sku: "", price: 0, promoPrice: 0, stockQty: 0, description: "", active: true });
      setFeedback({ tone: "success", text: "Producto creado correctamente." });
      toast.success("Producto creado");
      router.refresh();
    } catch (error) {
      console.error("[app/catalog] Product create request crashed.", error);
      setFeedback({ tone: "error", text: "Ocurrio un error de red al crear el producto." });
      toast.error("Error de red", "No pudimos crear el producto.");
    } finally {
      setIsCreating(false);
    }
  }

  async function updateStock(id: string) {
    const stockQty = Number(effectiveStock[id]);
    if (Number.isNaN(stockQty) || stockQty < 0) {
      toast.error("Stock invalido", "El stock debe ser 0 o mayor.");
      return;
    }

    setSavingStockId(id);
    try {
      const response = await fetch(`/api/app/catalog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockQty })
      });

      if (!response.ok) {
        const json = await safeJson(response);
        console.error("[app/catalog] Stock update failed.", json);
        toast.error("No se pudo actualizar stock", String(json?.error || "Intenta nuevamente."));
        return;
      }

      const json = await response.json();
      const nextProduct = json?.product;
      setProducts((prev) =>
        prev.map((item) => (item.id === id ? { ...item, stockQty: Number(nextProduct?.stockQty ?? stockQty) } : item))
      );
      setStockDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success("Stock actualizado");
      router.refresh();
    } catch (error) {
      console.error("[app/catalog] Stock update request crashed.", error);
      toast.error("Error de red", "No pudimos actualizar el stock.");
    } finally {
      setSavingStockId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
        <h3 className="font-semibold">Nuevo producto</h3>
        <p className="mt-1 text-sm text-muted">Carga un item del catalogo con datos minimos y guardalo desde el portal.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Categoria" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
          <input className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="SKU" value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} />
          <input type="number" className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Precio" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))} />
          <input type="number" className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Promo" value={form.promoPrice} onChange={(e) => setForm((p) => ({ ...p, promoPrice: Number(e.target.value) }))} />
          <input type="number" className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Stock" value={form.stockQty} onChange={(e) => setForm((p) => ({ ...p, stockQty: Number(e.target.value) }))} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={createProduct} disabled={isCreating} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {isCreating ? "Guardando..." : "Guardar"}
          </button>
          {feedback.tone ? <p className={`text-xs ${feedback.tone === "success" ? "text-green-400" : "text-red-300"}`}>{feedback.text}</p> : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {products.length ? (
              products.map((product) => (
                <tr key={product.id} className="border-t border-[color:var(--border)]">
                  <td className="px-4 py-3">{product.name}</td>
                  <td className="px-4 py-3">${product.price}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={effectiveStock[product.id]}
                        className="w-20 rounded border border-[color:var(--border)] bg-bg px-2 py-1"
                        onChange={(e) => setStockDrafts((prev) => ({ ...prev, [product.id]: Number(e.target.value) }))}
                      />
                      <button
                        type="button"
                        onClick={() => updateStock(product.id)}
                        disabled={savingStockId === product.id}
                        className="rounded border border-[color:var(--border)] px-2 py-1 text-xs text-muted hover:text-text disabled:opacity-50"
                      >
                        {savingStockId === product.id ? "..." : "Guardar"}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">{product.active ? "Activo" : "Inactivo"}</td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-[color:var(--border)]">
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">
                  Todavia no hay productos cargados. Usa el formulario superior y revisa esta tabla para confirmar el alta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
