export type UploadResult = {
  url: string;
  path: string;
  width: number | null;
  height: number | null;
  size: number;
  mimeType: string;
};

export type UploadOptions = {
  cacheControl?: string;
  convertToWebp?: boolean;
  maxWidth?: number;
  maxHeight?: number;
};

export type AvifVariantResult = {
  url: string;
  path: string;
  size: number;
};

export type AvifVariantOptions = {
  maxWidth?: number;
  maxHeight?: number;
};

export interface StorageProvider {
  uploadImage(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult>;
  /**
   * Encodes `buffer` to AVIF and uploads it next to an already-uploaded
   * WebP variant. `basePath` is the `path` returned by `uploadImage` (e.g.
   * `images/2026/08/uuid-nome.webp`) — the implementation swaps the
   * extension to `.avif`, keeping both variants in the same directory
   * under the same identifier.
   */
  uploadAvifVariant(
    buffer: Buffer,
    basePath: string,
    options?: AvifVariantOptions
  ): Promise<AvifVariantResult>;
  delete(path: string): Promise<void>;
  getPublicUrl(path: string): Promise<string>;
  createSignedUrl(path: string, expiresIn: number): Promise<string>;
  /**
   * Garante que o bucket de mídia exista antes do primeiro upload (cria se
   * necessário). Idempotente — chamar em todo boot do servidor é seguro.
   */
  ensureBucketExists(): Promise<void>;
}
