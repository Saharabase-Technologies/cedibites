<div className=" flex items-start justify-center pt-20 px-4 pointer-events-none">
    <div className="bg-white dark:bg-brand-darker rounded-3xl max-w-2xl w-full shadow-2xl animate-in slide-in-from-top duration-300 pointer-events-auto">



        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
            {/* ============================================ */}
            {/* LOADING STATE */}
            {/* ============================================ */}
            {isLoading && (
                <div className="p-12 text-center">
                    <SpinnerGapIcon
                        size={48}
                        className="mx-auto mb-4 text-primary animate-spin"
                    />
                    <p className="text-sm text-neutral-gray">Searching...</p>
                </div>
            )}

            {/* ============================================ */}
            {/* SEARCH RESULTS */}
            {/* ============================================ */}
            {!isLoading && query && results.length > 0 && (
                <div className="p-6 space-y-2">
                    <p className="text-xs font-semibold text-neutral-gray uppercase mb-3">
                        Found {results.length} {results.length === 1 ? 'item' : 'items'}
                    </p>
                    {results.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-neutral-light dark:hover:bg-brand-dark transition-colors text-left group"
                        >
                            {/* Icon/Image */}
                            <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-2xl flex-shrink-0">
                                {item.image ? (
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    item.icon || '🍽️'
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-text-dark dark:text-text-light group-hover:text-primary transition-colors truncate">
                                    {item.name}
                                </h4>
                                {item.description && (
                                    <p className="text-sm text-neutral-gray truncate">
                                        {item.description}
                                    </p>
                                )}
                                {item.category && (
                                    <span className="text-xs text-neutral-gray">
                                        {item.category}
                                    </span>
                                )}
                            </div>

                            {/* Price & Arrow */}
                            <div className="flex items-center gap-3 shrink-0">
                                {showPrices && item.price !== undefined && (
                                    <span className="font-bold text-primary">
                                        GHS {item.price}
                                    </span>
                                )}
                                <ArrowRightIcon size={20} className="text-neutral-gray" />
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* ============================================ */}
            {/* NO RESULTS */}
            {/* ============================================ */}
            {!isLoading && query && results.length === 0 && (
                <div className="p-12 text-center">
                    <MagnifyingGlassIcon
                        size={64}
                        className="mx-auto mb-4 text-neutral-gray"
                    />
                    <p className="text-lg font-semibold text-text-dark dark:text-text-light mb-2">
                        No results for "{query}"
                    </p>
                    <p className="text-sm text-neutral-gray">
                        Try searching for Jollof, Banku, or Waakye
                    </p>
                </div>
            )}

            {/* ============================================ */}
            {/* RECENT & POPULAR SEARCHES */}
            {/* ============================================ */}
            {!isLoading && !query && (
                <div className="p-6 space-y-6">
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <ClockIcon
                                        size={18}
                                        weight="bold"
                                        className="text-neutral-gray"
                                    />
                                    <span className="text-xs font-semibold text-neutral-gray uppercase">
                                        Recent Searches
                                    </span>
                                </div>
                                <button
                                    onClick={clearRecentSearches}
                                    className="text-xs font-semibold text-error hover:underline"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {recentSearches.map((search, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSuggestionClick(search)}
                                        className="px-4 py-2 bg-neutral-light dark:bg-brand-dark hover:bg-primary-light dark:hover:bg-primary/20 rounded-full text-sm font-medium text-text-dark dark:text-text-light transition-colors"
                                    >
                                        {search}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Popular Searches */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <TrendUpIcon
                                size={18}
                                weight="bold"
                                className="text-primary"
                            />
                            <span className="text-xs font-semibold text-neutral-gray uppercase">
                                Popular Searches
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {popularSearches.map((search, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(search)}
                                    className="px-4 py-2 bg-linear-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border border-primary/20 rounded-full text-sm font-medium text-text-dark dark:text-text-light transition-all"
                                >
                                    {search}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-gray/20 bg-neutral-light dark:bg-brand-dark rounded-b-3xl">
            <p className="text-xs text-center text-neutral-gray">
                Press{' '}
                <kbd className="px-2 py-1 bg-white dark:bg-brand-darker border border-neutral-gray/20 rounded text-xs font-mono">
                    ESC
                </kbd>{' '}
                to close
            </p>
        </div>
    </div>
</div>