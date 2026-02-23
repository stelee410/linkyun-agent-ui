/**
 * 检测是否为 Chrome 移动端浏览器
 * 用于应用针对 Chrome 移动端的 hack（如底部空白撑高）
 */
export function isChromeMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isChrome = /Chrome|CriOS/.test(ua) && !/Edge|Edg|OPR|SamsungBrowser/.test(ua);
  return isMobile && isChrome;
}
