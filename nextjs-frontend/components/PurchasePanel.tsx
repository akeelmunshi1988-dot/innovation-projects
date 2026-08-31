'use client';
import { useMemo,useState } from 'react';
import type { CatalogRug,CatalogSize } from '@/lib/types';

const label=(s:CatalogSize)=>s.label||`${s.width_ft||s.width||''}×${s.height_ft||s.height||''} ft`;
const cost=(s:CatalogSize)=>s.total_cost??s.price??null;
export function PurchasePanel({rug}:{rug:CatalogRug}){
 const initial=rug.sizes.find(s=>s.is_default)||rug.default_size||rug.sizes[0];const [selected,setSelected]=useState(initial);const [quantity,setQuantity]=useState(1);const total=useMemo(()=>selected&&cost(selected)!=null?Number(cost(selected))*quantity:rug.display_price!=null?rug.display_price*quantity:null,[selected,quantity,rug.display_price]);
 return <div><div className="eyebrow">Choose size & purchase</div><div className="size-list">{rug.sizes.map((s,i)=><button type="button" key={`${label(s)}-${i}`} className={`size ${s===selected?'active':''}`} onClick={()=>setSelected(s)}>{label(s)}</button>)}</div><label className="eyebrow" htmlFor="qty">Quantity</label><input id="qty" className="field" style={{width:'100%',margin:'10px 0 18px'}} type="number" min={1} value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)))}/><div style={{display:'flex',justifyContent:'space-between',padding:'18px 0',borderTop:'1px solid var(--line)'}}><strong>Estimated Total</strong><strong>{total==null?'Request price':new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(total)}</strong></div>{!rug.available&&<p style={{color:'#b42318'}}>This rug is currently out of stock.</p>}<button className="button" style={{width:'100%',marginBottom:10}} disabled={!rug.available}>Add to cart</button><button className="button outline" style={{width:'100%'}} onClick={()=>document.getElementById('quote')?.scrollIntoView()}>Request a quote</button></div>;
}
