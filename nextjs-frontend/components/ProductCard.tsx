import Link from 'next/link';
import { absoluteMediaUrl } from '@/lib/api';
import type { CatalogRug } from '@/lib/types';

const money = (value: number | null) => value == null ? 'Request price' : new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value);
export function ProductCard({ rug }: { rug: CatalogRug }) {
  return <article className="card"><Link href={`/catalog/${rug.slug}`}>
    <div className="card-image">{rug.image_url ? <img src={absoluteMediaUrl(rug.image_url)} alt={rug.name} loading="lazy"/> : null}{!rug.available && <div className="stock">OUT OF STOCK</div>}</div>
    <h2>{rug.name}</h2><div className="muted" style={{fontSize:13}}>{money(rug.display_price)}{rug.default_size?.label ? ` · ${rug.default_size.label}` : ''}</div>
  </Link></article>;
}
