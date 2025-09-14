import fs from 'fs';
import path from 'path';

export class FileDB<T extends object> {
  private filePath: string;
  private data: T;
  constructor(filename: string, defaultData: T) {
    const dir = path.resolve('data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    this.filePath = path.join(dir, filename);
    if (fs.existsSync(this.filePath)) {
      this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as T;
    } else {
      this.data = defaultData;
      this.flush();
    }
  }
  get(): T { return this.data; }
  set(updater: (d: T) => void) { updater(this.data); this.flush(); }
  flush() { fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8'); }
}

