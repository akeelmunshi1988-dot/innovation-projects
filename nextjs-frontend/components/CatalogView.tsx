import { getCatalog } from '@/lib/api';
import { ProductCard } from './ProductCard';

export async function CatalogView({ facet, value, searchParams={} }: {facet?:'room_type'|'mood'|'material';value?:string;searchParams?:Record<string,string|string[]|undefined>}) {
  const params:Record<string,string|number|undefined>={limit:60};
  if(facet&&value)params[facet]=value;
  for(const key of ['room_type','mood','material','pile','search','sort']){const v=searchParams[key];if(typeof v==='string')params[key]=v;}
  const data=await getCatalog(params);
  const title=value?value.split('_').map(s=>s[0].toUpperCase()+s.slice(1)).join(' '):'Latest Rug Designs';
  return <div className="shell"><header className="catalog-header"><div className="eyebrow">Handcrafted collection</div><h1 className="section-title">{title}</h1><p className="muted">{data.total} made-to-order designs</p></header><form className="catalog-tools"><input className="field" name="search" defaultValue={typeof searchParams.search==='string'?searchParams.search:''} placeholder="Search rugs…"/><select className="field" name="sort" defaultValue={typeof searchParams.sort==='string'?searchParams.sort:'default'}><option value="default">Featured</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option><option value="lead-asc">Fastest delivery</option></select><button className="button" type="submit">Apply</button></form>{data.items.length?<div className="grid">{data.items.map(r=><ProductCard key={r.id} rug={r}/>)}</div>:<div className="simple-page" style={{textAlign:'center'}}><h2 className="serif">No rugs found</h2><p className="muted">Try a different search or collection.</p></div>}</div>;
}
