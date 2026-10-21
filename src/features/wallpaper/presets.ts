export interface BuiltinWallpaper {
  id: string;
  name: string;
  background: string;
  /** 壁纸明暗，决定文字与玻璃配色的明暗方案 */
  scheme: 'dark' | 'light';
}

export const BUILTIN_WALLPAPERS: BuiltinWallpaper[] = [
  {
    id: 'nebula',
    name: '星云',
    scheme: 'dark',
    background:
      'radial-gradient(120% 90% at 15% 10%, #2b3a8f 0%, transparent 60%), radial-gradient(100% 80% at 85% 20%, #7a3b8f 0%, transparent 55%), linear-gradient(160deg, #0b1026 0%, #141a3a 55%, #1d1440 100%)',
  },
  {
    id: 'abyss',
    name: '深海',
    scheme: 'dark',
    background:
      'radial-gradient(110% 85% at 80% 15%, #14507a 0%, transparent 55%), linear-gradient(165deg, #04121f 0%, #072033 60%, #0a2a3f 100%)',
  },
  {
    id: 'forest',
    name: '苔原',
    scheme: 'dark',
    background:
      'radial-gradient(110% 85% at 20% 15%, #1f6b4a 0%, transparent 55%), linear-gradient(165deg, #07160f 0%, #0d2417 60%, #123527 100%)',
  },
  {
    id: 'dusk',
    name: '暮色',
    scheme: 'dark',
    background:
      'radial-gradient(120% 90% at 75% 15%, #b3556b 0%, transparent 55%), radial-gradient(90% 70% at 15% 80%, #6b3b8f 0%, transparent 50%), linear-gradient(165deg, #1c1024 0%, #2a1526 60%, #170e20 100%)',
  },
  {
    id: 'paper',
    name: '纸墨',
    scheme: 'light',
    background: 'linear-gradient(165deg, #ece9e0 0%, #d9d5c7 100%)',
  },
];

export function findBuiltin(id: string): BuiltinWallpaper | undefined {
  return BUILTIN_WALLPAPERS.find((wallpaper) => wallpaper.id === id);
}
