declare module "pdf-parse" {
  export interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    version: string;
    text: string;
  }

  function pdf(dataBuffer: Buffer | Uint8Array, options?: Record<string, any>): Promise<PDFData>;

  export = pdf;
}
