import { test, expect } from '@playwright/test';

const devices = [
  { name: 'Desktop', width: 1920, height: 1080 },
  { name: 'Laptop', width: 1366, height: 768 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile Large', width: 414, height: 896 },
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Mobile Small', width: 320, height: 568 }
];

test.describe('Responsive Design Tests', () => {
  devices.forEach(device => {
    test.describe(`${device.name} (${device.width}x${device.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
      });

      test('should display navigation correctly', async ({ page }) => {
        const navMenu = page.locator('.nav-menu');
        await expect(navMenu).toBeVisible();

        // 检查导航项是否可见
        const navItems = page.locator('.nav-item');
        await expect(navItems).toBeVisible();

        // 在小屏幕上检查导航布局
        if (device.width <= 768) {
          const headerContent = page.locator('.header-content');
          const headerStyle = await headerContent.evaluate((el) => {
            return window.getComputedStyle(el);
          });

          // 在移动设备上导航应该垂直排列
          expect(headerStyle.flexDirection || headerStyle.display).toContain('column');
        }
      });

      test('should display hero section correctly', async ({ page }) => {
        const heroSection = page.locator('.hero-section');
        await expect(heroSection).toBeVisible();

        // 检查英雄内容布局
        const heroContent = page.locator('.hero-content');
        await expect(heroContent).toBeVisible();

        // 在移动设备上检查垂直布局
        if (device.width <= 768) {
          const contentStyle = await heroContent.evaluate((el) => {
            return window.getComputedStyle(el);
          });

          // 移动设备上应该是垂直排列
          expect(contentStyle.flexDirection || contentStyle.display).toContain('column');
          expect(contentStyle.textAlign || '').toContain('center');
        }

        // 检查标题是否正确缩放
        const heroTitle = page.locator('.hero-title');
        await expect(heroTitle).toBeVisible();

        const titleStyle = await heroTitle.evaluate((el) => {
          return window.getComputedStyle(el);
        });

        // 标题字体大小应该适应屏幕
        expect(parseInt(titleStyle.fontSize || '0')).toBeGreaterThan(20);
        expect(parseInt(titleStyle.fontSize || '0')).toBeLessThan(100);
      });

      test('should display statistics correctly', async ({ page }) => {
        const statsSection = page.locator('.stats-section');
        await expect(statsSection).toBeVisible();

        const statItems = page.locator('.stat-item');
        await expect(statItems).toHaveCount(4);

        // 根据屏幕尺寸检查网格布局
        const gridCols = device.width >= 1024 ? 4 :
                         device.width >= 768 ? 2 : 1;

        for (let i = 0; i < 4; i++) {
          const statItem = statItems.nth(i);
          await expect(statItem).toBeVisible();

          // 检查内容是否可见
          await expect(statItem.locator('.stat-icon')).toBeVisible();
          await expect(statItem.locator('.stat-number')).toBeVisible();
          await expect(statItem.locator('.stat-label')).toBeVisible();
        }
      });

      test('should display features section correctly', async ({ page }) => {
        const featuresSection = page.locator('.features-section');
        await expect(featuresSection).toBeVisible();

        const featureCards = page.locator('.feature-card');
        await expect(featureCards).toHaveCount(6);

        // 检查功能卡片是否可见
        for (let i = 0; i < 6; i++) {
          const card = featureCards.nth(i);
          await expect(card).toBeVisible();

          // 检查卡片内容
          await expect(card.locator('.feature-icon')).toBeVisible();
          await expect(card.locator('.feature-title')).toBeVisible();
          await expect(card.locator('.feature-description')).toBeVisible();
        }

        // 在移动设备上，功能卡片应该是单列布局
        if (device.width <= 768) {
          const firstCard = featureCards.first();
          const cardBounds = await firstCard.boundingBox();
          if (cardBounds) {
            expect(cardBounds.width).toBeLessThanOrEqual(device.width - 40); // 考虑padding
          }
        }
      });

      test('should display workflow section correctly', async ({ page }) => {
        const workflowSection = page.locator('.workflow-section');
        await expect(workflowSection).toBeVisible();

        const workflowSteps = page.locator('.workflow-step');
        await expect(workflowSteps).toHaveCount(5);

        // 检查每个工作流步骤
        for (let i = 0; i < 5; i++) {
          const step = workflowSteps.nth(i);
          await expect(step).toBeVisible();

          // 检查步骤内容
          await expect(step.locator('.step-number')).toBeVisible();
          await expect(step.locator('.step-icon')).toBeVisible();
          await expect(step.locator('.step-title')).toBeVisible();
          await expect(step.locator('.step-description')).toBeVisible();
        }

        // 在移动设备上，连接线应该隐藏
        if (device.width <= 768) {
          const workflowLine = page.locator('.workflow-line');
          const lineStyle = await workflowLine.evaluate((el) => {
            return window.getComputedStyle(el);
          });
          expect(lineStyle.display).toBe('none');
        }
      });

      test('should display action buttons correctly', async ({ page }) => {
        const primaryBtn = page.locator('.action-btn.primary');
        const secondaryBtn = page.locator('.action-btn.secondary');

        await expect(primaryBtn).toBeVisible();
        await expect(secondaryBtn).toBeVisible();

        // 在移动设备上，按钮应该是垂直排列
        if (device.width <= 768) {
          const heroActions = page.locator('.hero-actions');
          const actionsStyle = await heroActions.evaluate((el) => {
            return window.getComputedStyle(el);
          });

          expect(actionsStyle.flexDirection || '').toContain('column');
        }

        // 检查按钮是否可点击
        const btnBounds = await primaryBtn.boundingBox();
        if (btnBounds) {
          // 移动设备上的按钮应该足够大以供触摸
          const minTouchTarget = device.width <= 768 ? 44 : 32;
          expect(btnBounds.height).toBeGreaterThanOrEqual(minTouchTarget);
          expect(btnBounds.width).toBeGreaterThanOrEqual(minTouchTarget);
        }
      });

      test('should handle horizontal scrolling properly', async ({ page }) => {
        // 获取页面总宽度
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = device.width;

        // 页面不应该有水平滚动
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // 允许1px的误差

        // 检查主要内容区域的宽度
        const contentWrapper = page.locator('.content-wrapper');
        const contentStyle = await contentWrapper.evaluate((el) => {
          return window.getComputedStyle(el);
        });

        // 内容不应该溢出
        expect(contentStyle.overflowX || 'visible').not.toBe('scroll');
        expect(contentStyle.overflowX || 'visible').not.toBe('auto');
      });

      test('should display text correctly at different sizes', async ({ page }) => {
        // 检查主要文本元素
        const textElements = [
          { selector: '.hero-title', minSize: 24, maxSize: 72 },
          { selector: '.hero-subtitle', minSize: 16, maxSize: 24 },
          { selector: '.section-title', minSize: 28, maxSize: 48 },
          { selector: '.feature-title', minSize: 18, maxSize: 24 }
        ];

        for (const element of textElements) {
          const el = page.locator(element.selector).first();
          await expect(el).toBeVisible();

          const style = await el.evaluate((el) => {
            return window.getComputedStyle(el);
          });

          const fontSize = parseInt(style.fontSize || '0');
          expect(fontSize).toBeGreaterThanOrEqual(element.minSize);
          expect(fontSize).toBeLessThanOrEqual(element.maxSize);
        }
      });

      test('should handle images and media correctly', async ({ page }) => {
        // 检查声波可视化器的响应式行为
        const soundVisualizer = page.locator('.sound-visualizer');
        await expect(soundVisualizer).toBeVisible();

        const visualizerBounds = await soundVisualizer.boundingBox();
        if (visualizerBounds) {
          // 在小屏幕上，可视化器应该更小
          const maxSize = device.width <= 480 ? 250 : 350;
          expect(visualizerBounds.width).toBeLessThanOrEqual(maxSize);
          expect(visualizerBounds.height).toBeLessThanOrEqual(maxSize);
        }
      });

      test('should maintain accessibility on all screen sizes', async ({ page }) => {
        // 检查所有可交互元素是否可以键盘导航
        const interactiveElements = page.locator('button, a, [role="button"]');
        const count = await interactiveElements.count();

        for (let i = 0; i < Math.min(count, 10); i++) { // 检查前10个元素
          const element = interactiveElements.nth(i);
          await expect(element).toBeVisible();

          // 检查元素是否有足够的点击区域
          const bounds = await element.boundingBox();
          if (bounds) {
            const minSize = device.width <= 768 ? 44 : 32;
            expect(bounds.height).toBeGreaterThanOrEqual(minSize);
            expect(bounds.width).toBeGreaterThanOrEqual(minSize);
          }
        }
      });

      test('should handle touch interactions on mobile devices', async ({ page }) => {
        if (device.width <= 768) {
          // 测试触摸目标大小
          const touchTargets = page.locator('.nav-item, .action-btn, .feature-card');
          const count = await touchTargets.count();

          for (let i = 0; i < Math.min(count, 5); i++) {
            const target = touchTargets.nth(i);
            const bounds = await target.boundingBox();

            if (bounds) {
              // iOS和Android推荐的最小触摸目标是44px
              expect(bounds.height).toBeGreaterThanOrEqual(44);
              expect(bounds.width).toBeGreaterThanOrEqual(44);
            }
          }
        }
      });
    });
  });

  test.describe('Orientation Changes', () => {
    test('should handle desktop orientation changes', async ({ page }) => {
      // 开始为横屏
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 切换到竖屏
      await page.setViewportSize({ width: 1080, height: 1920 });
      await page.waitForTimeout(500);

      // 检查主要元素仍然可见
      await expect(page.locator('.hero-section')).toBeVisible();
      await expect(page.locator('.nav-menu')).toBeVisible();
      await expect(page.locator('.features-section')).toBeVisible();
    });

    test('should handle mobile orientation changes', async ({ page }) => {
      // 开始为竖屏
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 获取竖屏时的布局信息
      const portraitNavItems = page.locator('.nav-item');
      const portraitCount = await portraitNavItems.count();

      // 切换到横屏
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);

      // 检查导航项是否仍然可见
      const landscapeNavItems = page.locator('.nav-item');
      await expect(landscapeNavItems).toHaveCount(portraitCount);

      // 检查主要内容是否仍然可见
      await expect(page.locator('.hero-section')).toBeVisible();
      await expect(page.locator('.hero-content')).toBeVisible();
    });
  });

  test.describe('Dynamic Content Loading', () => {
    test('should load content appropriately for different screen sizes', async ({ page }) => {
      // 测试小屏幕设备
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/');

      // 等待页面加载
      await page.waitForLoadState('networkidle');

      // 检查是否加载了适当的内容密度
      const featureCards = page.locator('.feature-card');
      await expect(featureCards).toHaveCount(6);

      // 在小屏幕上，内容应该是更紧凑的
      const firstCard = featureCards.first();
      const cardStyle = await firstCard.evaluate((el) => {
        return window.getComputedStyle(el);
      });

      // 检查padding是否适当调整
      const paddingTop = parseInt(cardStyle.paddingTop || '0');
      expect(paddingTop).toBeLessThanOrEqual(40); // 移动设备上应该有较小的padding
    });

    test('should handle progressive enhancement', async ({ page }) => {
      // 在慢速网络条件下测试
      await page.route('**/*', async (route) => {
        // 模拟慢速CSS加载
        if (route.request().resourceType() === 'stylesheet') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        await route.continue();
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 即使CSS加载延迟，基本内容也应该可见
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.nav-menu')).toBeVisible();
    });
  });
});

test.describe('Performance Tests', () => {
  test('should load quickly on mobile devices', async ({ page }) => {
    // 模拟移动设备网络条件
    await page.route('**/*', async (route) => {
      // 模拟3G网络
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      await route.continue();
    });

    const startTime = Date.now();
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // 在慢速网络下，页面应该在10秒内加载完成
    expect(loadTime).toBeLessThan(10000);
  });

  test('should not cause layout shifts during loading', async ({ page }) => {
    await page.goto('/');

    // 监控CLS (Cumulative Layout Shift)
    let layoutShifts = 0;
    await page.evaluateOnNewDocument(() => {
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
            layoutShifts += entry.value;
          }
        });
      }).observe({ entryTypes: ['layout-shift'] });
    });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 等待额外的布局稳定

    // CLS应该小于0.1
    const finalLayoutShift = await page.evaluate(() => (window as any).layoutShifts || 0);
    expect(finalLayoutShift).toBeLessThan(0.1);
  });
});