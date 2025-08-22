import AddToCart from "./_AddToCart";

type Option = { id: string; name: string; priceDelta: number };
type OptionGroup = { id: string; name: string; maxSelect: number; options: Option[] };
type Item = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  categoryId?: string | null;
  optionGroups?: OptionGroup[];
};
type Category = { id: string; name: string };
type Resto = { name: string; categories: Category[]; items: Item[] };

async function getMenu(): Promise<Resto> {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/menu/demo-deli`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load menu");
  return res.json();
}

export default async function MenuPage() {
  const resto = await getMenu();
  const byCat: Record<string, Item[]> = Object.fromEntries(
    resto.categories.map((c) => [c.id, resto.items.filter((i) => i.categoryId === c.id)])
  );

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.12),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(14,165,233,0.12),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-4 py-14 relative">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            {resto.name}
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Order fresh, fast, and fee-free. Customize your meal with tasty add-ons.
          </p>
        </div>
      </section>

      {/* Menu */}
      <main className="mx-auto max-w-6xl px-4 pb-16 space-y-10">
        {resto.categories.map((cat) => (
          <section key={cat.id} className="space-y-5">
            <h2 className="text-2xl font-semibold text-slate-900">{cat.name}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {byCat[cat.id]?.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm hover:shadow-md transition p-5 backdrop-blur"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                    <div className="text-sm font-bold text-slate-900">
                      ${(item.price / 100).toFixed(2)}
                    </div>
                  </div>
                  {item.description && (
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                  )}

                  <AddToCart item={item} />
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
