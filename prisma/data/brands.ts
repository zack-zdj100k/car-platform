import type { SeedBrand } from './types';

/**
 * Development brand catalogue (spec §73). Country and description are factual
 * background information about each marque, not invented marketing claims.
 */
export const brands: SeedBrand[] = [
  { name: 'BYD', slug: 'byd', country: 'China', isFeatured: true, description: 'Build Your Dreams — a Shenzhen-based manufacturer known for its Blade battery technology and plug-in hybrid DM-i powertrains.' },
  { name: 'Chery', slug: 'chery', country: 'China', isFeatured: true, description: 'One of China’s largest vehicle exporters, recognised for its Tiggo SUV family and efficient turbocharged petrol engines.' },
  { name: 'Geely', slug: 'geely', country: 'China', isFeatured: true, description: 'A Hangzhou-based group whose engineering is shared across several international marques, with a focus on refinement and connectivity.' },
  { name: 'Haval', slug: 'haval', country: 'China', isFeatured: true, description: 'The dedicated SUV marque of Great Wall Motor, specialising in family crossovers and hybrid drivetrains.' },
  { name: 'MG', slug: 'mg', country: 'China / United Kingdom', isFeatured: true, description: 'A historic British marque now developed and produced by SAIC Motor, combining European chassis tuning with Chinese manufacturing.' },
  { name: 'Changan', slug: 'changan', country: 'China', description: 'One of China’s oldest automotive groups, producing the Uni and CS series with an emphasis on expressive design.' },
  { name: 'GAC', slug: 'gac', country: 'China', description: 'Guangzhou Automobile Group, known for the Emkoo and Emzoom crossovers and its Mega Wave engine family.' },
  { name: 'Jetour', slug: 'jetour', country: 'China', description: 'A Chery sub-brand focused on travel-oriented SUVs with generous interior packaging.' },
  { name: 'Omoda', slug: 'omoda', country: 'China', description: 'A design-led Chery sub-brand aimed at younger buyers, with a strong emphasis on styling and cabin technology.' },
  { name: 'Zeekr', slug: 'zeekr', country: 'China', isFeatured: true, description: 'Geely’s premium electric marque, built on the SEA architecture with a focus on performance and fast charging.' },
  { name: 'XPeng', slug: 'xpeng', country: 'China', description: 'An electric-vehicle manufacturer known for advanced driver-assistance software and 800V architectures.' },
  { name: 'NIO', slug: 'nio', country: 'China', description: 'A premium electric marque recognised for its battery-swap network and lounge-like interiors.' },
  { name: 'Hongqi', slug: 'hongqi', country: 'China', description: 'FAW’s luxury flagship marque, historically the state limousine brand of China.' },
  { name: 'Wuling', slug: 'wuling', country: 'China', description: 'A high-volume manufacturer known for compact, affordable urban vehicles.' },
];
