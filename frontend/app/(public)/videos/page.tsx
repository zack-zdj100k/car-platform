import type { Metadata } from 'next';
import { VideoGallery } from '@/components/videos/video-gallery';
import { fetchCarsWithVideo } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'Videos',
  description: 'Every car in the catalogue that has been filmed.',
};

/** Videos page: one tile per vehicle that has a clip. */
export default async function VideosPage() {
  const cars = await fetchCarsWithVideo();
  return <VideoGallery cars={cars} />;
}
