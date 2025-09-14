"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDB = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class FileDB {
    constructor(filename, defaultData) {
        const dir = path_1.default.resolve('data');
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir);
        this.filePath = path_1.default.join(dir, filename);
        if (fs_1.default.existsSync(this.filePath)) {
            this.data = JSON.parse(fs_1.default.readFileSync(this.filePath, 'utf-8'));
        }
        else {
            this.data = defaultData;
            this.flush();
        }
    }
    get() { return this.data; }
    set(updater) { updater(this.data); this.flush(); }
    flush() { fs_1.default.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8'); }
}
exports.FileDB = FileDB;
