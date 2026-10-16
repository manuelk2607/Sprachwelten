import type {Entry} from './content';
export type AdminEntry=Entry&{revision:number;deletedAt:string|null;authorId:string|null};
export type AdminUser={id:string;name:string;email:string;emailVerified:boolean;createdAt:string;lastSignIn:string|null;isAdmin:boolean};
