import {Home} from '@/components/home';
import {homeMetadata} from '@/lib/seo';
export const metadata=homeMetadata('de');
export default function Page(){return <><script dangerouslySetInnerHTML={{__html:"if(location.hash==='#entdecken')location.replace('/lernen#entdecken')"}}/><Home/></>;}
