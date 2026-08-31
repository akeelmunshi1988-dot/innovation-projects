import { CatalogView } from '@/components/CatalogView';
export default async function Page({params,searchParams}:{params:Promise<{value:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){const [{value},query]=await Promise.all([params,searchParams]);return <CatalogView facet="room_type" value={value} searchParams={query}/>}
