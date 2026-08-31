import { SupabaseStorageProvider } from '../infra/storage/SupabaseStorageProvider';
import { StorageProvider } from '../infra/storage/StorageProvider';

export const storageProvider: StorageProvider = new SupabaseStorageProvider();
