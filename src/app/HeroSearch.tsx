'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/restaurants?q=${encodeURIComponent(q)}` : '/restaurants');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl mx-auto flex items-center gap-2 bg-white rounded-2xl p-2 shadow-lg shadow-black/10"
    >
      <div className="relative flex-1">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-ink/30" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ادور على مطعم أو أكلة..."
          className="w-full pr-11 pl-3 py-2.5 text-sm text-brand-ink bg-transparent focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 bg-brand-red text-white font-extrabold px-6 py-2.5 rounded-xl hover:bg-brand-red-dark transition-colors"
      >
        دور
      </button>
    </form>
  );
}
