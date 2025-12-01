import { test, expect } from '@playwright/test';

test.describe('Home Page UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main hero section with correct content', async ({ page }) => {
    // 检查英雄区域是否存在
    await expect(page.locator('.hero-section')).toBeVisible();

    // 检查主标题
    const mainTitle = page.locator('.hero-title .title-main');
    await expect(mainTitle).toBeVisible();
    await expect(mainTitle).toContainText('SoundStory');

    // 检查副标题
    const accentTitle = page.locator('.hero-title .title-accent');
    await expect(accentTitle).toBeVisible();
    await expect(accentTitle).toContainText('AI');

    // 检查副标题文本
    const subtitle = page.locator('.hero-subtitle');
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toContainText('声波叙事');

    // 检查描述文本
    const description = page.locator('.hero-description');
    await expect(description).toBeVisible();
    await expect(description).toContainText('融合尖端AI技术');
  });

  test('should display action buttons with correct styling', async ({ page }) => {
    // 检查主要操作按钮
    const primaryBtn = page.locator('.action-btn.primary');
    await expect(primaryBtn).toBeVisible();
    await expect(primaryBtn).toContainText('开始创作');

    // 检查次要操作按钮
    const secondaryBtn = page.locator('.action-btn.secondary');
    await expect(secondaryBtn).toBeVisible();
    await expect(secondaryBtn).toContainText('配置模型');

    // 检查按钮图标
    await expect(primaryBtn.locator('.btn-icon')).toContainText('✨');
    await expect(secondaryBtn.locator('.btn-icon')).toContainText('⚙️');
  });

  test('should display sound visualizer with animations', async ({ page }) => {
    // 检查声波可视化器
    const visualizer = page.locator('.sound-visualizer');
    await expect(visualizer).toBeVisible();

    // 检查扩展环
    await expect(page.locator('.visualizer-ring.ring-1')).toBeVisible();
    await expect(page.locator('.visualizer-ring.ring-2')).toBeVisible();
    await expect(page.locator('.visualizer-ring.ring-3')).toBeVisible();

    // 检查核心
    await expect(page.locator('.visualizer-core')).toBeVisible();

    // 检查音频条
    const soundBars = page.locator('.sound-bars .bar');
    await expect(soundBars).toHaveCount(5);
  });

  test('should display statistics section with correct data', async ({ page }) => {
    // 检查统计区域
    await expect(page.locator('.stats-section')).toBeVisible();

    // 检查统计项
    const statItems = page.locator('.stat-item');
    await expect(statItems).toHaveCount(4);

    // 检查每个统计项的内容
    const expectedStats = [
      { icon: '🤖', label: '可用AI模型' },
      { icon: '📚', label: '创作小说' },
      { icon: '🎵', label: '生成音频' },
      { icon: '📦', label: '导出文件' }
    ];

    for (let i = 0; i < expectedStats.length; i++) {
      const statItem = statItems.nth(i);
      await expect(statItem.locator('.stat-icon')).toContainText(expectedStats[i].icon);
      await expect(statItem.locator('.stat-label')).toContainText(expectedStats[i].label);
      await expect(statItem.locator('.stat-number')).toBeVisible();
    }
  });

  test('should display core features section', async ({ page }) => {
    // 检查功能区域
    await expect(page.locator('.features-section')).toBeVisible();
    await expect(page.locator('.section-title')).toContainText('完整创作链路');

    // 检查功能卡片
    const featureCards = page.locator('.feature-card');
    await expect(featureCards).toHaveCount(6);

    // 检查每个功能卡片的基本结构
    for (let i = 0; i < 6; i++) {
      const card = featureCards.nth(i);
      await expect(card.locator('.feature-icon')).toBeVisible();
      await expect(card.locator('.feature-title')).toBeVisible();
      await expect(card.locator('.feature-description')).toBeVisible();
      await expect(card.locator('.feature-link')).toBeVisible();
    }
  });

  test('should display workflow section', async ({ page }) => {
    // 检查工作流程区域
    await expect(page.locator('.workflow-section')).toBeVisible();
    await expect(page.locator('.section-title')).toContainText('五步成章');

    // 检查工作流程步骤
    const workflowSteps = page.locator('.workflow-step');
    await expect(workflowSteps).toHaveCount(5);

    // 检查每个步骤的内容
    for (let i = 0; i < 5; i++) {
      const step = workflowSteps.nth(i);
      await expect(step.locator('.step-number')).toContainText((i + 1).toString());
      await expect(step.locator('.step-icon')).toBeVisible();
      await expect(step.locator('.step-title')).toBeVisible();
      await expect(step.locator('.step-description')).toBeVisible();
    }
  });

  test('should display system status section', async ({ page }) => {
    // 检查系统状态区域
    await expect(page.locator('.status-section')).toBeVisible();
    await expect(page.locator('.section-title')).toContainText('实时状态');

    // 检查ApiStatus组件
    await expect(page.locator('.status-container')).toBeVisible();
  });

  test('should display call-to-action section', async ({ page }) => {
    // 检查CTA区域
    await expect(page.locator('.cta-section')).toBeVisible();

    // 检查CTA文本
    await expect(page.locator('.cta-title')).toContainText('准备好开始您的AI创作之旅了吗？');
    await expect(page.locator('.cta-subtitle')).toContainText('加入数万名创作者');

    // 检查CTA按钮
    await expect(page.locator('.cta-btn.primary')).toContainText('立即开始');
    await expect(page.locator('.cta-btn.secondary')).toContainText('查看文档');
  });

  test('should have proper CSS variables and styling applied', async ({ page }) => {
    // 检查主要元素是否应用了正确的样式
    const heroSection = page.locator('.hero-section');
    const computedStyle = await heroSection.evaluate((el) => {
      return window.getComputedStyle(el);
    });

    // 验证背景样式
    expect(computedStyle.background).toContain('rgb');

    // 检查玻璃拟态效果
    const statItem = page.locator('.stat-item').first();
    const statStyle = await statItem.evaluate((el) => {
      return window.getComputedStyle(el);
    });

    expect(statStyle.backdropFilter).toContain('blur');
  });

  test('should display background elements', async ({ page }) => {
    // 检查动态背景元素
    await expect(page.locator('.app-background')).toBeVisible();
    await expect(page.locator('.aurora-bg')).toBeVisible();
    await expect(page.locator('.sound-waves')).toBeVisible();

    // 检查粒子效果
    const particles = page.locator('.text-particles .particle');
    await expect(particles).toHaveCount(20);
  });
});

test.describe('Home Page Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to novel creation when clicking start button', async ({ page }) => {
    // 点击开始创作按钮
    await page.click('.action-btn.primary');

    // 等待导航完成
    await page.waitForURL('**/novel');

    // 验证URL已更改
    expect(page.url()).toContain('/novel');
  });

  test('should navigate to models when clicking configure button', async ({ page }) => {
    // 点击配置模型按钮
    await page.click('.action-btn.secondary');

    // 等待导航完成
    await page.waitForURL('**/models');

    // 验证URL已更改
    expect(page.url()).toContain('/models');
  });

  test('should navigate to correct pages when clicking feature cards', async ({ page }) => {
    const featureRoutes = ['/models', '/novel', '/analysis', '/tts', '/subtitle', '/output'];
    const featureCards = page.locator('.feature-card');

    for (let i = 0; i < featureRoutes.length; i++) {
      await page.goto('/'); // 重新加载首页
      await featureCards.nth(i).click();
      await page.waitForTimeout(1000); // 等待可能的动画
      expect(page.url()).toContain(featureRoutes[i]);
    }
  });

  test('should show hover effects on interactive elements', async ({ page }) => {
    // 测试按钮悬停效果
    const primaryBtn = page.locator('.action-btn.primary');
    await primaryBtn.hover();

    // 检查是否应用了悬停样式
    const btnStyle = await primaryBtn.evaluate((el) => {
      return window.getComputedStyle(el);
    });
    expect(btnStyle.transform).toContain('translateY');

    // 测试功能卡片悬停效果
    const featureCard = page.locator('.feature-card').first();
    await featureCard.hover();

    // 检查链接是否显示
    await expect(featureCard.locator('.feature-link')).toBeVisible();
  });

  test('should be responsive to viewport changes', async ({ page }) => {
    // 测试桌面视图
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('.hero-content')).toHaveCSS('display', 'grid');

    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // 等待响应式调整

    // 测试移动视图
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // 等待响应式调整

    // 在移动视图下，内容应该是垂直排列的
    const heroContent = page.locator('.hero-content');
    const contentStyle = await heroContent.evaluate((el) => {
      return window.getComputedStyle(el);
    });
    expect(contentStyle.flexDirection || contentStyle.display).toContain('column');
  });
});

test.describe('Home Page Performance', () => {
  test('should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // 页面应该在5秒内加载完成
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 检查是否有控制台错误
    expect(consoleErrors).toHaveLength(0);
  });

  test('should render all images and assets properly', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('requestfailed', (request) => {
      failedRequests.push(request.url());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 检查是否有失败的资源请求
    expect(failedRequests.length).toBe(0);
  });
});