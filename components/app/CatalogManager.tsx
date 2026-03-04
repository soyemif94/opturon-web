"use client";

import { useState } from "react";

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
  const [products, setProducts] = useState(initialProducts);
  const [form, setForm] = useState({ name: "", category: "", sku: "", price: 0, promoPrice: 0, stockQty: 0, description: "", active: true });

  async function createProduct() {
    const response = await fetch("/api/app/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (!response.ok) return;
    const json = await response.json();
    setProducts((prev) => [json.product, ...prev]);
    setForm({ name: "", category: "", sku: "", price: 0, promoPrice: 0, stockQty: 0, description: "", active: true });
  }

  async function updateStock(id: string, stockQty: number) {
    const response = await fetch(`/api/app/catalog/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockQty })
    });
    if (!response.ok) return;
    setProducts((prev) => prev.map((item) => (item.id === id ? { ...item, stockQty } : item)));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
        <h3 className="font-semibold">Nuevo producto</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Categoría" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
          <input className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="SKU" value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} />
          <input type="number" className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Precio" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))} />
          <input type="number" className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Promo" value={form.promoPrice} onChange={(e) => setForm((p) => ({ ...p, promoPrice: Number(e.target.value) }))} />
          <input type="number" className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Stock" value={form.stockQty} onChange={(e) => setForm((p) => ({ ...p, stockQty: Number(e.target.value) }))} />
        </div>
        <button onClick={createProduct} className="mt-3 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">Guardar</button>
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
            {products.map((product) => (
              <tr key={product.id} className="border-t border-[color:var(--border)]">
                <td className="px-4 py-3">{product.name}</td>
                <td className="px-4 py-3">${product.price}</td>
                <td className="px-4 py-3">
                  <input type="number" value={product.stockQty} className="w-20 rounded border border-[color:var(--border)] bg-bg px-2 py-1" onChange={(e) => updateStock(product.id, Number(e.target.value))} />
                </td>
                <td className="px-4 py-3">{product.active ? "Activo" : "Inactivo"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

