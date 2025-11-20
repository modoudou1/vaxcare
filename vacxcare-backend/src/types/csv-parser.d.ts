declare module "csv-parser" {
  import { Transform } from "stream";

  interface CsvParserOptions {
    separator?: string;
    headers?: boolean | string[];
    skipLines?: number;
    strict?: boolean;
  }

  export default function csvParser(options?: CsvParserOptions): Transform;
}