'use client';

import { useKitchen } from '../context';
import type { Order } from '@/types/order';

export default function KitchenDisplayPage() {
  const { ordersByStatus } = useKitchen();

  return (
    <div className="min-h-dvh flex bg-white">
      <div className="flex-1 grid grid-cols-3 min-h-0 overflow-hidden">
        <StatusColumn title="Accepted" orders={ordersByStatus.accepted} />
        <StatusColumn title="Cooking" orders={ordersByStatus.preparing} />
        <StatusColumn title="Ready" orders={ordersByStatus.ready} />
      </div>
    </div>
  );
}

interface StatusColumnProps {
  title: string;
  orders: Order[];
}

function StatusColumn({ title, orders }: StatusColumnProps) {
  return (
    <div className="flex flex-col border-r border-black/8 last:border-r-0">
      <div className="shrink-0 px-6 py-5 border-b border-black/8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold font-body text-text-dark">{title}</h2>
          <span className="text-3xl font-bold font-body text-text-dark/30">{orders.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm font-body text-black/20">No orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-y divide-black/8">
            {orders.map(order => (
              <div key={order.id} className="py-7 px-3 text-center">
                <p className="text-2xl font-bold font-body leading-none text-text-dark">
                  {order.orderNumber}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
