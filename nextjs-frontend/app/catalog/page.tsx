import type { Metadata } from 'next';
import { CatalogView } from '@/components/CatalogView';
export const metadata:Metadata={title:'Rug Collection — Wool, Silk, Cotton & Synthetic',description:'Browse handcrafted rugs in wool, silk, cotton and synthetic weaves. Every design is available in custom sizes.',alternates:{canonical:'/catalog'}};
export default async function Catalog({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <CatalogView searchParams={await searchParams}/>}
