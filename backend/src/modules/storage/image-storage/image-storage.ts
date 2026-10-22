/** Abstraction over where profile imagery (avatars, company logos) lives. */
export abstract class ImageStorage {
  /** Persists an image and returns a URL/path the frontend can render in an `<img src>`. */
  abstract upload(buffer: Buffer, folder: string, originalName: string): Promise<string>;
}
