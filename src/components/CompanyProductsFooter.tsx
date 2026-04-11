/**
 * Company products footer - shows Wetech ecosystem products
 * Used in both business owner settings and customer settings
 */
export const CompanyProductsFooter = () => {
  const products = [
    { name: 'Wetech', url: 'https://wetech.lovable.app', initial: 'W', color: 'bg-blue-600' },
    { name: 'Tasklink', url: 'https://tasklink.lovable.app', initial: 'T', color: 'bg-emerald-600' },
    { name: 'Conffo', url: 'https://conffo.lovable.app', initial: 'C', color: 'bg-purple-600' },
    { name: 'Telemed', url: 'https://telemed.lovable.app', initial: 'T', color: 'bg-red-600' },
    { name: 'iCard', url: 'https://icard.lovable.app', initial: 'i', color: 'bg-amber-600' },
  ];

  return (
    <div className="pt-6 pb-2 border-t border-border mt-4">
      <p className="text-[10px] text-muted-foreground text-center mb-3">Bidhaa Zetu</p>
      <div className="flex items-center justify-center gap-5 flex-wrap">
        {products.map(p => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <div className={`w-10 h-10 rounded-full ${p.color} text-white flex items-center justify-center text-sm font-bold shadow-md`}>
              {p.initial}
            </div>
            <span className="text-[10px] font-medium">{p.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
};
