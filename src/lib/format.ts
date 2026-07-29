export const currency=(value?:number)=>value==null?'Not listed':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
export const number=(value?:number)=>value==null?'Unavailable':new Intl.NumberFormat('en-US').format(value);
export const date=(value?:string)=>{if(!value)return 'Not listed';const d=new Date(value);return Number.isNaN(d.getTime())?'Not listed':new Intl.DateTimeFormat('en-US',{dateStyle:'medium'}).format(d)};
export const dateTime=(value?:string)=>{if(!value)return 'Not available';const d=new Date(value);return Number.isNaN(d.getTime())?'Not available':new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(d)};
