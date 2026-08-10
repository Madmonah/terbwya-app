'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { MenuItem } from '@/lib/types';
import { addToCart } from '@/lib/cart';

export default function MenuList({
  items,
  restaurantId,
  restaurantName,
}: {
  items: MenuItem[];
  restaurantId: string;
  restaurantName: string;
}) {
  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const key = item.category || 'أصناف';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, groupItems]) => (
        <div key={category}>
          <h3 className="font-bold text-brand-red mb-3">{category}</h3>
          <div className="space-y-3">
            {groupItems.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                restaurantId={restaurantId}
                restaurantName={restaurantName}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuItemRow({
  item,
  restaurantId,
  restaurantName,
}: {
  item: MenuItem;
  restaurantId: string;
  restaurantName: string;
}) {
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(
    item.sizes && item.sizes.length > 0 ? item.sizes[0].id : null
  );

  const price =
    selectedSizeId && item.sizes
      ? item.sizes.find((s) => s.id === selectedSizeId)?.price ?? item.price
      : item.price;

  function handleAdd() {
    const result = addToCart({
      menuItemId: item.id,
      menuSizeId: selectedSizeId,
      restaurantId,
      restaurantName,
      name: item.name_ar,
      price,
      quantity: 1,
    });
    if (!result.ok && result.reason === 'DIFFERENT_RESTAURANT') {
      toast.error('السلة فيها أوردر من مطعم تاني. لازم تفضي السلة الأول.');
      return;
    }
    toast.success(`اتضاف ${item.name_ar} للسلة`);
  }

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3">
      <div className="w-16 h-16 rounded-lg bg-brand-cream flex items-center justify-center overflow-hidden flex-shrink-0">
        {item.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo_url} alt={item.name_ar} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">🍽️</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-brand-ink text-sm">{item.name_ar}</div>
        {item.description_ar && (
          <div className="text-xs text-brand-ink/50 line-clamp-1">{item.description_ar}</div>
        )}
        {item.sizes && item.sizes.length > 0 && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {item.sizes.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSizeId(s.id)}
                className={`text-xs px-2 py-1 rounded-full border font-semibold ${
                  selectedSizeId === s.id
                    ? 'bg-brand-red text-white border-brand-red'
                    : 'bg-white text-brand-ink/70 border-gray-200'
                }`}
              >
                {s.name_ar} — {s.price} ج.م
              </button>
            ))}
          </div>
        )}
        <div className="font-extrabold text-brand-orange text-sm mt-1">{price} ج.م</div>
      </div>
      <button
        onClick={handleAdd}
        className="bg-brand-red text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-brand-red-dark transition-colors flex-shrink-0"
      >
        إضافة
      </button>
    </div>
  );
}
