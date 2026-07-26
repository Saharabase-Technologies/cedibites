/**
 * Configure "Setup" shell - an Admin-only getting-started overview. The individual
 * master-data screens (categories, units, locations, settings) now live in their
 * own sections (Catalog / System), so this is just a header around the setup hub.
 */
export function ConfigureShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold font-brand text-text-dark">Setup</h1>
        <p className="text-neutral-gray text-sm font-body mt-1">
          Get your inventory ready - units, categories, locations, items and recipes.
        </p>
      </div>
      {children}
    </div>
  );
}
