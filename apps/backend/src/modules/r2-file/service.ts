import type {
  FileTypes,
  IFileProvider,
  Logger,
  ProviderDeleteFileDTO,
  ProviderFileResultDTO,
  ProviderGetFileDTO,
  ProviderGetPresignedUploadUrlDTO,
  ProviderUploadFileDTO,
  ProviderUploadStreamDTO,
} from "@medusajs/framework/types";
import { AbstractFileProviderService, MedusaError } from "@medusajs/framework/utils";
import S3FileProvider from "@medusajs/medusa/file-s3";
import type { Readable } from "node:stream";

/** The provider's options (`modules.ts`, from the `S3_*` keys; M6 D127). */
export type R2FileOptions = {
  endpoint: string;
  /** `auto` for R2 (`S3_REGION` blank). */
  region: string;
  access_key_id: string;
  secret_access_key: string;
  /** Public files (product pictures), served from `file_url`. */
  bucket: string;
  /** Private files (CSV imports and exports): a bucket with no public access, read only through presigned URLs. */
  private_bucket: string;
  /** `S3_PUBLIC_URL`: the public bucket's domain (a custom domain, or `r2.dev` for a dev bucket). */
  file_url: string;
  /** How long a presigned download link lives, in seconds (file-s3's default: an hour). */
  download_file_duration?: number;
};

/** Where a public file's key starts, in `bucket`. */
export const PUBLIC_PREFIX = "medusa/";

/**
 * Where a private file's key starts, in `private_bucket`. Medusa names a file by its key alone when
 * it reads or deletes it (`retrieveFile(id)`, `deleteFiles(id)`: the module passes `{ fileKey }` and
 * nothing else), so the key itself says which bucket holds it. A public key always starts with
 * `PUBLIC_PREFIX`, so a public file named `private/x.png` is `medusa/private/x-<ulid>.png`, never
 * routed to the private bucket.
 */
export const PRIVATE_PREFIX = "private/";

/** The private bucket holds the key (`PRIVATE_PREFIX`); every other key is in the public one. */
export const isPrivateKey = (key: string): boolean => key.startsWith(PRIVATE_PREFIX);

/**
 * Medusa's own S3 provider (`@medusajs/file-s3`, 2.22.6), whose class is not exported on its own:
 * the module provider's only service. Its options are file-s3's (`file_url`, `bucket`, `prefix`,
 * `acl`, `additional_client_config`…).
 */
type S3FileServiceClass = new (
  deps: { logger: Logger },
  options: Record<string, unknown>,
) => IFileProvider;

const S3FileService = (S3FileProvider as { services: unknown[] }).services[0] as S3FileServiceClass;

type InjectedDependencies = { logger: Logger };

/**
 * Medusa's files on Cloudflare R2 over its S3 API (M6 D127, SPEC §10.7), in two buckets: Medusa's
 * File Module takes exactly one provider, and `file-s3` one bucket (its code says a private bucket
 * is still to come), so this provider holds two of `file-s3`'s services and sends each call to one.
 *
 * - **Public** (`access: "public"`: Medusa Admin's uploads, the product pictures): `S3_BUCKET`, keys
 *   under `medusa/`, linked from `S3_PUBLIC_URL`.
 * - **Private** (everything else, and Medusa's default when `access` is not given: the CSV imports'
 *   presigned uploads, the product, order, customer and inventory exports): `S3_PRIVATE_BUCKET`,
 *   which has no public access, keys under `private/`; Medusa reads them only through presigned
 *   URLs (an export's notification links one).
 *
 * `acl: false` on both: R2 sets access per bucket, and its PutObject takes no `x-amz-acl` header
 * (file-s3 would otherwise send `public-read` or `private`). Path-style requests (`forcePathStyle`),
 * as Payload's R2 guide sets them, so a presigned URL names its bucket in its path.
 */
export class R2FileProviderService extends AbstractFileProviderService {
  static identifier = "r2";

  protected readonly logger_: Logger;
  protected readonly public_: IFileProvider;
  protected readonly private_: IFileProvider;

  static validateOptions(options: Record<string, unknown>): void {
    const missing = [
      "endpoint",
      "access_key_id",
      "secret_access_key",
      "bucket",
      "private_bucket",
      "file_url",
    ].filter((key) => typeof options[key] !== "string" || (options[key] as string).trim() === "");
    if (missing.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `The R2 file provider needs ${missing.join(", ")} (the S3_* keys, M6 D127)`,
      );
    }
    if (options.bucket === options.private_bucket) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "S3_PRIVATE_BUCKET must be another bucket than S3_BUCKET: R2 makes a whole bucket public, so private files in the public one could be read by anyone who learns a key (M6 D127)",
      );
    }
  }

  constructor({ logger }: InjectedDependencies, options: R2FileOptions) {
    super();
    R2FileProviderService.validateOptions(options);
    this.logger_ = logger;
    const shared = {
      endpoint: options.endpoint,
      region: options.region || "auto",
      access_key_id: options.access_key_id,
      secret_access_key: options.secret_access_key,
      acl: false,
      additional_client_config: { forcePathStyle: true },
      ...(options.download_file_duration === undefined
        ? {}
        : { download_file_duration: options.download_file_duration }),
    };
    this.public_ = new S3FileService(
      { logger },
      {
        ...shared,
        bucket: options.bucket,
        prefix: PUBLIC_PREFIX,
        file_url: options.file_url.replace(/\/+$/, ""),
      },
    );
    // A private file has no public URL. file-s3 still returns `<file_url>/<key>` as its `url`, so
    // this one is the S3 API's own address of the object, which answers nobody without a signature.
    this.private_ = new S3FileService(
      { logger },
      {
        ...shared,
        bucket: options.private_bucket,
        prefix: PRIVATE_PREFIX,
        file_url: `${options.endpoint.replace(/\/+$/, "")}/${options.private_bucket}`,
        // An export is read once, from the admin's notification: not cached anywhere.
        cache_control: "private, no-store",
      },
    );
  }

  /** The store a new file goes to: public only when Medusa says so. */
  protected storeFor(access: FileTypes.FileAccessPermission | undefined): IFileProvider {
    return access === "public" ? this.public_ : this.private_;
  }

  /** The store that holds a file, from its key. */
  protected storeOf(key: string): IFileProvider {
    return isPrivateKey(key) ? this.private_ : this.public_;
  }

  async upload(file: ProviderUploadFileDTO): Promise<ProviderFileResultDTO> {
    return this.storeFor(file.access).upload(file);
  }

  async getUploadStream(fileData: ProviderUploadStreamDTO) {
    return this.storeFor(fileData.access).getUploadStream(fileData);
  }

  async getPresignedUploadUrl(
    fileData: ProviderGetPresignedUploadUrlDTO,
  ): Promise<ProviderFileResultDTO> {
    return this.storeFor(fileData.access).getPresignedUploadUrl!(fileData);
  }

  async delete(files: ProviderDeleteFileDTO | ProviderDeleteFileDTO[]): Promise<void> {
    const list = Array.isArray(files) ? files : [files];
    const priv = list.filter((file) => isPrivateKey(file.fileKey));
    const pub = list.filter((file) => !isPrivateKey(file.fileKey));
    await Promise.all([
      priv.length > 0 ? this.private_.delete(priv) : undefined,
      pub.length > 0 ? this.public_.delete(pub) : undefined,
    ]);
  }

  async getPresignedDownloadUrl(fileData: ProviderGetFileDTO): Promise<string> {
    return this.storeOf(fileData.fileKey).getPresignedDownloadUrl(fileData);
  }

  async getDownloadStream(fileData: ProviderGetFileDTO): Promise<Readable> {
    return this.storeOf(fileData.fileKey).getDownloadStream(fileData);
  }

  async getAsBuffer(fileData: ProviderGetFileDTO): Promise<Buffer> {
    return this.storeOf(fileData.fileKey).getAsBuffer(fileData);
  }
}
