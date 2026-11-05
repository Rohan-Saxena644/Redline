import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'REDLINE · Purchasing with boundaries',description:'Give agents a mission. Keep control of the money. An open-source policy enforcement SDK and sandbox purchasing workspace.'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
