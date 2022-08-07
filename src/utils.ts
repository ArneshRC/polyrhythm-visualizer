export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms)) 
export const pipe = (...fns: Function[]) => (x: any) => fns.reduce((v, f) => f(v), x);
