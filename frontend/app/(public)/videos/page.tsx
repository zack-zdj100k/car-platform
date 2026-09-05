import type { Metadata } from 'next';
import { serverDictionary } from '@/lib/i18n/server';
import { VideoGallery } from '@/components/videos/video-gallery';
import { fetchCarsWithVideo } from '@/lib/server-api';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverDictionary();
  return { title: t.meta.videosTitle, description: t.meta.videosDescription };
}

/** Videos page: one tile per vehicle that has a clip. */
export default async function VideosPage() {
  const cars = await fetchCarsWithVideo();
  return <VideoGallery cars={cars} />;
}
