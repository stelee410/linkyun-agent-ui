/** 本地占位图路径，用于完全离线部署 */
export const PLACEHOLDER = {
  avatar: '/placeholder/avatar-default.svg',
  avatar400: '/placeholder/avatar-default-400.svg',
  card: '/placeholder/card-default.svg',
} as const;

/** hero 占位图列表 (hero-1.jpg ~ hero-6.jpg) */
const HERO_PLACEHOLDERS = [1, 2, 3, 4, 5, 6].map((i) => `/placeholder/hero-${i}.jpg`);

/** 从 hero-1.jpg ~ hero-6.jpg 中随机选取一张 */
export function getRandomHeroPlaceholder(): string {
  const idx = Math.floor(Math.random() * HERO_PLACEHOLDERS.length);
  return HERO_PLACEHOLDERS[idx];
}
