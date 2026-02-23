/**
 * 移动端视口高度修复：使用 VisualViewport API 动态设置 --vh CSS 变量
 * 解决 Chrome 底部菜单遮挡、Safari 键盘弹出破坏布局等问题
 */
export function initViewportHeight(): void {
  if (typeof window === 'undefined') return;

  const setVh = () => {
    const vh = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setVh();

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener('resize', setVh);
    vv.addEventListener('scroll', setVh);
  }
  window.addEventListener('resize', setVh);
  window.addEventListener('orientationchange', () => {
    setTimeout(setVh, 100);
  });
}
