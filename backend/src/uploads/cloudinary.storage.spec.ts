import { CloudinaryStorage } from './cloudinary.storage';

/**
 * Reading a file's identity back out of its address.
 *
 * This is what deletion depends on: the administration knows a photograph by
 * the URL stored against the vehicle, and nothing else survives a page reload.
 * Get it wrong in one direction and files are never removed — the account fills
 * with photographs of vehicles that were deleted months ago. Get it wrong in
 * the other and a delete aimed at one file removes another.
 */
describe('CloudinaryStorage.publicIdFromUrl', () => {
  it('reads the id out of a delivery URL', () => {
    expect(
      CloudinaryStorage.publicIdFromUrl(
        'https://res.cloudinary.com/demo/image/upload/v1699000000/zodic/m1x2-ab12cd34.jpg',
      ),
    ).toBe('zodic/m1x2-ab12cd34');
  });

  it('reads it without a version', () => {
    expect(
      CloudinaryStorage.publicIdFromUrl('https://res.cloudinary.com/demo/image/upload/zodic/a.png'),
    ).toBe('zodic/a');
  });

  it('reads a video URL the same way', () => {
    expect(
      CloudinaryStorage.publicIdFromUrl(
        'https://res.cloudinary.com/demo/video/upload/v1699000000/zodic/clip.mp4',
      ),
    ).toBe('zodic/clip');
  });

  it('keeps transformation segments out of the id', () => {
    // Anything before /upload/ is delivery instructions, not identity.
    expect(
      CloudinaryStorage.publicIdFromUrl(
        'https://res.cloudinary.com/demo/image/upload/v1/zodic/nested/deep/file.webp',
      ),
    ).toBe('zodic/nested/deep/file');
  });

  it('refuses anything that is not a Cloudinary address', () => {
    // Local storage handles these, and must keep handling them: a stray match
    // here would send a filesystem delete to an image host instead.
    expect(CloudinaryStorage.publicIdFromUrl('/uploads/abc.jpg')).toBeNull();
    expect(CloudinaryStorage.publicIdFromUrl('abc.jpg')).toBeNull();
    expect(CloudinaryStorage.publicIdFromUrl('https://example.com/image/upload/v1/a.jpg')).toBeNull();
    expect(CloudinaryStorage.publicIdFromUrl('')).toBeNull();
  });

  it('refuses a Cloudinary host with no upload path', () => {
    expect(CloudinaryStorage.publicIdFromUrl('https://res.cloudinary.com/demo/')).toBeNull();
  });
});
