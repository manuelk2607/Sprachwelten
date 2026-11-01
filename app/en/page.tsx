import {Home} from '@/components/home';
import {homeMetadata} from '@/lib/seo';
export const metadata=homeMetadata('en');
export default function Page(){return <><script dangerouslySetInnerHTML={{__html:"if(location.hash==='#entdecken')location.replace('/en/learn#entdecken')"}}/><Home/></>;}
