/**
 * Company products footer - shows Wetech ecosystem products
 * Used in both business owner settings and customer settings
 */
export const CompanyProductsFooter = () => {
  const products = [
    { name: 'Wetech', url: 'https://wetech.lovable.app', emoji: '🌐' },
    { name: 'Tasklink', url: 'https://tasklink.lovable.app', emoji: '📋' },
    { name: 'Conffo', url: 'https://conffo.lovable.app', emoji: '🎤' },
    { name: 'Telemed', url: 'https://telemed.lovable.app', emoji: '🏥' },
    { name: 'SmartInvite', url: 'https://smartinvite.lovable.app', emoji: '💌' },
  ];

  return (
    <div className="pt-6 pb-2 border-t border-border mt-4">
      <p className="text-[10px] text-muted-foreground text-center mb-3">Bidhaa Zetu</p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {products.map(p => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <span className="text-xl">{p.emoji}</span>
            <span className="text-[9px] font-medium">{p.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
};
