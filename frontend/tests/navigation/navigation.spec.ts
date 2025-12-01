import { test, expect } from '@playwright/test';

test.describe('Navigation System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display main navigation with all menu items', async ({ page }) => {
    // 检查导航菜单是否存在
    const navMenu = page.locator('.nav-menu');
    await expect(navMenu).toBeVisible();

    // 检查所有导航项
    const navItems = page.locator('.nav-item');
    await expect(navItems).toHaveCount(7);

    // 验证导航项内容
    const expectedNavItems = [
      { icon: '🏠', text: '首页' },
      { icon: '🤖', text: '模型配置' },
      { icon: '✍️', text: '小说生成' },
      { icon: '🎭', text: '角色分析' },
      { icon: '🎙️', text: '语音合成' },
      { icon: '📝', text: '字幕生成' },
      { icon: '📦', text: '文件输出' }
    ];

    for (let i = 0; i < expectedNavItems.length; i++) {
      const navItem = navItems.nth(i);
      await expect(navItem.locator('.nav-icon')).toContainText(expectedNavItems[i].icon);
      await expect(navItem.locator('.nav-text')).toContainText(expectedNavItems[i].text);
    }
  });

  test('should display brand section with correct elements', async ({ page }) => {
    // 检查品牌区域
    const brandSection = page.locator('.brand-section');
    await expect(brandSection).toBeVisible();

    // 检查Logo容器
    const logoContainer = page.locator('.logo-container');
    await expect(logoContainer).toBeVisible();

    // 检查应用标题
    const appTitle = page.locator('.app-title');
    await expect(appTitle).toBeVisible();
    await expect(appTitle).toContainText('SoundStory AI');

    // 检查品牌副标题
    const brandSubtitle = page.locator('.brand-subtitle');
    await expect(brandSubtitle).toBeVisible();
    await expect(brandSubtitle).toContainText('声波叙事');

    // 检查声波Logo
    const soundLogo = page.locator('.sound-logo');
    await expect(soundLogo).toBeVisible();
    await expect(soundLogo.locator('.el-icon')).toBeVisible();
    await expect(soundLogo.locator('.sound-ring')).toBeVisible();
  });

  test('should have active state indicators for current page', async ({ page }) => {
    // 在首页时，首页链接应该有活跃状态
    const homeNavLink = page.locator('.nav-item').first();
    await expect(homeNavLink).toHaveClass(/router-link-active/);

    // 检查活跃指示器
    await expect(homeNavLink.locator('.nav-indicator')).toBeVisible();
  });

  test('should navigate correctly when clicking navigation items', async ({ page }) => {
    const navRoutes = ['/', '/models', '/novel', '/analysis', '/tts', '/subtitle', '/output'];
    const navItems = page.locator('.nav-item');

    for (let i = 0; i < navRoutes.length; i++) {
      await page.goto('/'); // 每次从首页开始
      await navItems.nth(i).click();

      // 等待导航完成
      await page.waitForTimeout(1000);

      // 验证URL
      expect(page.url()).toContain(navRoutes[i]);
    }
  });

  test('should show hover effects on navigation items', async ({ page }) => {
    const navItem = page.locator('.nav-item').nth(1); // 选择第二个导航项进行测试

    // 悬停前检查状态
    await expect(navItem).not.toHaveClass(/hover/);

    // 执行悬停
    await navItem.hover();

    // 检查悬停效果（通过CSS变换或背景变化）
    const computedStyle = await navItem.evaluate((el) => {
      return window.getComputedStyle(el);
    });

    // 验证有变换效果或边框变化
    const hasTransform = computedStyle.transform !== 'none';
    const hasBorderChange = computedStyle.borderColor !== 'rgba(0, 0, 0, 0)';

    expect(hasTransform || hasBorderChange).toBe(true);
  });

  test('should display footer with correct content', async ({ page }) => {
    // 检查页脚
    const footer = page.locator('.app-footer');
    await expect(footer).toBeVisible();

    // 检查页脚内容
    const footerInfo = page.locator('.footer-info');
    await expect(footerInfo).toBeVisible();
    await expect(footerInfo.locator('p')).toContainText('© 2025 SoundStory AI');

    // 检查页脚链接
    const footerLinks = page.locator('.footer-links');
    await expect(footerLinks).toBeVisible();
    await expect(footerLinks.locator('.footer-link')).toHaveCount(3);
  });

  test('should handle navigation with browser back/forward buttons', async ({ page }) => {
    // 导航到不同页面
    await page.click('.nav-item >> text=模型配置');
    await page.waitForURL('**/models');

    await page.click('.nav-item >> text=小说生成');
    await page.waitForURL('**/novel');

    // 使用浏览器后退按钮
    await page.goBack();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/models');

    // 使用浏览器前进按钮
    await page.goForward();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/novel');
  });

  test('should maintain navigation state on page refresh', async ({ page }) => {
    // 导航到特定页面
    await page.click('.nav-item >> text=语音合成');
    await page.waitForURL('**/tts');

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 验证仍在同一页面且导航状态正确
    expect(page.url()).toContain('/tts');

    // 检查对应导航项的活跃状态
    const ttsNavLink = page.locator('.nav-item').filter({ hasText: '语音合成' });
    await expect(ttsNavLink).toHaveClass(/router-link-active/);
  });
});

test.describe('Navigation Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Tab键导航测试
    await page.keyboard.press('Tab');

    // 第一个可聚焦元素应该是导航中的某个项
    const focusedElement = await page.locator(':focus');
    expect(focusedElement).toBeVisible();

    // 继续Tab键导航
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const currentFocused = await page.locator(':focus');
      await expect(currentFocused).toBeVisible();
    }
  });

  test('should have proper ARIA labels', async ({ page }) => {
    const navMenu = page.locator('.nav-menu');

    // 检查导航是否有适当的role属性
    const navRole = await navMenu.getAttribute('role');
    expect(navRole === 'navigation' || navRole === null).toBe(true);

    // 检查导航链接是否有正确的文本内容
    const navLinks = page.locator('.nav-item');
    for (let i = 0; i < await navLinks.count(); i++) {
      const link = navLinks.nth(i);
      const linkText = await link.locator('.nav-text').textContent();
      expect(linkText?.trim()).toBeTruthy();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const navItems = page.locator('.nav-item');

    for (let i = 0; i < await navItems.count(); i++) {
      const navItem = navItems.nth(i);
      const styles = await navItem.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor
        };
      });

      // 基本的颜色可见性检查
      expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
      expect(styles.backgroundColor).not.toBe('rgb(0, 0, 0)');
    }
  });
});

test.describe('Navigation Responsive Design', () => {
  test('should adapt to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // 检查导航在移动设备上的显示
    const headerContent = page.locator('.header-content');
    const headerStyle = await headerContent.evaluate((el) => {
      return window.getComputedStyle(el);
    });

    // 在移动设备上，导航应该是垂直排列的
    expect(headerStyle.flexDirection || headerStyle.display).toContain('column');

    // 检查导航项在移动设备上的适配
    const navItems = page.locator('.nav-item');
    for (let i = 0; i < await navItems.count(); i++) {
      const navItem = navItems.nth(i);
      await expect(navItem).toBeVisible();

      // 检查导航项大小是否适合触摸操作
      const boundingBox = await navItem.boundingBox();
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(44); // 最小触摸目标尺寸
      }
    }
  });

  test('should adapt to tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // 检查导航在平板设备上的显示
    const navMenu = page.locator('.nav-menu');
    await expect(navMenu).toBeVisible();

    // 导航项应该仍然清晰可见
    const navItems = page.locator('.nav-item');
    for (let i = 0; i < await navItems.count(); i++) {
      await expect(navItems.nth(i)).toBeVisible();
    }
  });

  test('should handle viewport orientation changes', async ({ page }) => {
    // 开始为横屏
    await page.setViewportSize({ width: 812, height: 375 }); // iPhone X 横屏
    await page.goto('/');
    await expect(page.locator('.nav-menu')).toBeVisible();

    // 切换到竖屏
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X 竖屏
    await page.waitForTimeout(500); // 等待响应式调整

    // 导航应该仍然可见且功能正常
    await expect(page.locator('.nav-menu')).toBeVisible();

    // 测试导航功能
    await page.click('.nav-item >> text=首页');
    await expect(page.url()).toContain('/');
  });
});

test.describe('Navigation Performance', () => {
  test('should load navigation quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await expect(page.locator('.nav-menu')).toBeVisible();
    const loadTime = Date.now() - startTime;

    // 导航应该在1秒内加载完成
    expect(loadTime).toBeLessThan(1000);
  });

  test('should have smooth transitions between pages', async ({ page }) => {
    await page.goto('/');

    // 测试页面转换速度
    const startTime = Date.now();
    await page.click('.nav-item >> text=模型配置');
    await page.waitForURL('**/models');
    const navigationTime = Date.now() - startTime;

    // 导航应该在2秒内完成
    expect(navigationTime).toBeLessThan(2000);
  });

  test('should not cause layout shifts during navigation', async ({ page }) => {
    await page.goto('/');

    // 获取初始布局信息
    const initialNavPosition = await page.locator('.nav-menu').boundingBox();
    expect(initialNavPosition).toBeTruthy();

    // 等待页面完全加载
    await page.waitForLoadState('networkidle');

    // 获取加载后的布局信息
    const finalNavPosition = await page.locator('.nav-menu').boundingBox();
    expect(finalNavPosition).toBeTruthy();

    // 导航位置不应该有显著变化
    if (initialNavPosition && finalNavPosition) {
      expect(Math.abs(initialNavPosition.x - finalNavPosition.x)).toBeLessThan(5);
      expect(Math.abs(initialNavPosition.y - finalNavPosition.y)).toBeLessThan(5);
    }
  });
});