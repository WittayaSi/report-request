declare module 'node-7z' {
  import { Readable } from 'stream';
  
  export interface AddOptions {
    password?: string;
    $bin?: string;
    recursive?: boolean;
    [key: string]: any;
  }

  export function add(archive: string, source: string | string[], options?: AddOptions): Readable;
  export function extract(archive: string, dest: string, options?: any): Readable;
  export function list(archive: string, options?: any): Readable;
}
