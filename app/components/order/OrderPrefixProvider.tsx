'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * The order prefix, handed down from the server render.
 *
 * A context rather than a prop because the screens that need it are client
 * components, and a layout in the App Router cannot pass props to the page
 * underneath it. The layout does the fetch, this carries the answer, and
 * `OrderCodeField` reads it during its first render rather than after.
 *
 * Undefined means no provider above, which is a legitimate state: the field
 * falls back to fetching for itself.
 */
const OrderPrefixContext = createContext<string | null | undefined>(undefined);

export function OrderPrefixProvider({ value, children }: {
    value: string | null;
    children: ReactNode;
}) {
    return <OrderPrefixContext.Provider value={value}>{children}</OrderPrefixContext.Provider>;
}

export function useOrderPrefix() {
    return useContext(OrderPrefixContext);
}
