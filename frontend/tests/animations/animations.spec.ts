import { test, expect } from '@playwright/test';

test.describe('Animation and Interaction Effects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('CSS Animations', () => {
    test('should animate hero elements on page load', async ({ page }) => {
      // 检查英雄文本的滑入动画
      const heroText = page.locator('.hero-text');
      await expect(heroText).toBeVisible();

      const textAnimation = await heroText.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          animationName: style.animationName,
          animationDuration: style.animationDuration,
          animationDelay: style.animationDelay
        };
      });

      expect(textAnimation.animationName).not.toBe('none');
      expect(parseFloat(textAnimation.animationDuration || '0')).toBeGreaterThan(0);

      // 检查英雄视觉元素的滑入动画
      const heroVisual = page.locator('.hero-visual');
      await expect(heroVisual).toBeVisible();

      const visualAnimation = await heroVisual.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          animationName: style.animationName,
          animationDuration: style.animationDuration
        };
      });

      expect(visualAnimation.animationName).not.toBe('none');
    });

    test('should animate sound visualizer rings', async ({ page }) => {
      // 检查声波环的扩展动画
      const rings = page.locator('.visualizer-ring');
      await expect(rings).toHaveCount(3);

      for (let i = 0; i < 3; i++) {
        const ring = rings.nth(i);
        const animation = await ring.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            animationName: style.animationName,
            animationDuration: style.animationDuration,
            animationIterationCount: style.animationIterationCount
          };
        });

        expect(animation.animationName).toContain('ring-expand');
        expect(parseFloat(animation.animationDuration || '0')).toBeGreaterThan(0);
        expect(animation.animationIterationCount).toBe('infinite');
      }
    });

    test('should animate sound bars', async ({ page }) => {
      // 检查音频条的脉冲动画
      const soundBars = page.locator('.sound-bars .bar');
      await expect(soundBars).toHaveCount(5);

      for (let i = 0; i < 5; i++) {
        const bar = soundBars.nth(i);
        const animation = await bar.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            animationName: style.animationName,
            animationDuration: style.animationDuration,
            animationDirection: style.animationDirection
          };
        });

        expect(animation.animationName).toContain('bar-pulse');
        expect(parseFloat(animation.animationDuration || '0')).toBeGreaterThan(0);
      }
    });

    test('should animate background elements', async ({ page }) => {
      // 检查Aurora背景动画
      const auroraBg = page.locator('.aurora-bg');
      await expect(auroraBg).toBeVisible();

      const auroraAnimation = await auroraBg.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          animationName: style.animationName,
          animationDuration: style.animationDuration,
          animationIterationCount: style.animationIterationCount
        };
      });

      expect(auroraAnimation.animationName).toContain('aurora-rotate');
      expect(parseFloat(auroraAnimation.animationDuration || '0')).toBeGreaterThan(0);

      // 检查声波动画
      const soundWaves = page.locator('.sound-waves');
      await expect(soundWaves).toBeVisible();

      const waves = page.locator('.wave');
      await expect(waves).toHaveCount(3);

      for (let i = 0; i < 3; i++) {
        const wave = waves.nth(i);
        const animation = await wave.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.animationName;
        });
        expect(animation).toContain('wave-motion');
      }
    });

    test('should animate floating particles', async ({ page }) => {
      // 检查文字粒子的浮动动画
      const particles = page.locator('.text-particles .particle');
      await expect(particles).toHaveCount(20);

      for (let i = 0; i < Math.min(5, await particles.count()); i++) {
        const particle = particles.nth(i);
        const animation = await particle.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            animationName: style.animationName,
            animationDuration: style.animationDuration
          };
        });

        expect(animation.animationName).toContain('particle-float');
        expect(parseFloat(animation.animationDuration || '0')).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Hover Effects', () => {
    test('should show hover effects on navigation items', async ({ page }) => {
      const navItem = page.locator('.nav-item').nth(1);

      // 悬停前的状态
      const beforeHover = await navItem.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          transform: style.transform,
          borderColor: style.borderColor,
          backgroundColor: style.backgroundColor
        };
      });

      // 执行悬停
      await navItem.hover();
      await page.waitForTimeout(300); // 等待过渡动画

      // 悬停后的状态
      const afterHover = await navItem.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          transform: style.transform,
          borderColor: style.borderColor,
          backgroundColor: style.backgroundColor
        };
      });

      // 验证变换效果
      expect(afterHover.transform).not.toBe(beforeHover.transform);

      // 验证悬停指示器
      const navIndicator = navItem.locator('.nav-indicator');
      await expect(navIndicator).toBeVisible();
    });

    test('should show hover effects on action buttons', async ({ page }) => {
      const primaryBtn = page.locator('.action-btn.primary');

      // 悬停前的状态
      const beforeHover = await primaryBtn.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          transform: style.transform,
          boxShadow: style.boxShadow
        };
      });

      // 执行悬停
      await primaryBtn.hover();
      await page.waitForTimeout(300);

      // 悬停后的状态
      const afterHover = await primaryBtn.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          transform: style.transform,
          boxShadow: style.boxShadow
        };
      });

      // 验证变换和阴影效果
      expect(afterHover.transform).toContain('translateY');
      expect(afterHover.boxShadow).not.toBe(beforeHover.boxShadow);

      // 检查光晕效果
      const btnGlow = primaryBtn.locator('.btn-glow');
      const glowOpacity = await btnGlow.evaluate((el) => {
        return window.getComputedStyle(el).opacity;
      });
      expect(parseFloat(glowOpacity || '0')).toBeGreaterThan(0);
    });

    test('should show hover effects on feature cards', async ({ page }) => {
      const featureCard = page.locator('.feature-card').first();

      // 悬停前检查链接状态
      const featureLink = featureCard.locator('.feature-link');
      await expect(featureLink).toHaveCSS('opacity', '0');

      // 执行悬停
      await featureCard.hover();
      await page.waitForTimeout(400); // 等待过渡动画

      // 检查变换效果
      const cardStyle = await featureCard.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          transform: style.transform,
          borderColor: style.borderColor,
          boxShadow: style.boxShadow
        };
      });

      expect(cardStyle.transform).toContain('translateY') || expect(cardStyle.transform).toContain('scale');
      expect(cardStyle.borderColor).toContain('0, 212, 255');

      // 检查链接显示
      await expect(featureLink).toHaveCSS('opacity', '1');

      // 检查链接箭头动画
      const linkArrow = featureLink.locator('.link-arrow');
      const arrowTransform = await linkArrow.evaluate((el) => {
        return window.getComputedStyle(el).transform;
      });
      expect(arrowTransform).toContain('translateX');

      // 检查粒子动画
      const iconParticles = featureCard.locator('.icon-particles .particle');
      await expect(iconParticles).toHaveCount(6);

      for (let i = 0; i < 6; i++) {
        const particle = iconParticles.nth(i);
        const animation = await particle.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.animationName;
        });
        expect(animation).toContain('icon-particle-float');
      }
    });

    test('should show hover effects on statistics items', async ({ page }) => {
      const statItem = page.locator('.stat-item').first();

      // 悬停前的状态
      const beforeHover = await statItem.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          transform: style.transform,
          borderColor: style.borderColor
        };
      });

      // 执行悬停
      await statItem.hover();
      await page.waitForTimeout(300);

      // 悬停后的状态
      const afterHover = await statItem.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          transform: style.transform,
          borderColor: style.borderColor,
          boxShadow: style.boxShadow
        };
      });

      expect(afterHover.transform).toContain('translateY');
      expect(afterHover.borderColor).toContain('0, 212, 255');
      expect(afterHover.boxShadow).toContain('0, 212, 255');
    });

    test('should show hover effects on workflow steps', async ({ page }) => {
      const stepContent = page.locator('.workflow-step .step-content').first();

      // 悬停前的状态
      const beforeHover = await stepContent.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          transform: style.transform,
          borderColor: style.borderColor
        };
      });

      // 执行悬停
      await stepContent.hover();
      await page.waitForTimeout(300);

      // 悬停后的状态
      const afterHover = await stepContent.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          transform: style.transform,
          borderColor: style.borderColor,
          boxShadow: style.boxShadow
        };
      });

      expect(afterHover.transform).toContain('translateY');
      expect(afterHover.borderColor).toContain('0, 212, 255');
      expect(afterHover.boxShadow).toContain('0, 212, 255');
    });
  });

  test.describe('Transition Effects', () => {
    test('should have smooth transitions on interactive elements', async ({ page }) => {
      const interactiveElements = [
        '.nav-item',
        '.action-btn',
        '.feature-card',
        '.stat-item',
        '.cta-btn'
      ];

      for (const selector of interactiveElements) {
        const element = page.locator(selector).first();
        await expect(element).toBeVisible();

        const transition = await element.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.transition;
        });

        // 所有交互元素都应该有过渡效果
        expect(transition).not.toBe('all 0s ease 0s');
        expect(transition).not.toBe('');
      }
    });

    test('should animate badge glow effect', async ({ page }) => {
      const heroBadge = page.locator('.hero-badge');
      await expect(heroBadge).toBeVisible();

      const badgeAnimation = await heroBadge.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          animationName: style.animationName,
          boxShadow: style.boxShadow
        };
      });

      expect(badgeAnimation.animationName).toContain('badge-glow');
      expect(badgeAnimation.boxShadow).toContain('255, 107, 107');
    });

    test('should animate title accent color', async ({ page }) => {
      const titleAccent = page.locator('.title-accent');
      await expect(titleAccent).toBeVisible();

      const accentAnimation = await titleAccent.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          animationName: style.animationName,
          filter: style.filter
        };
      });

      expect(accentAnimation.animationName).toContain('accent-pulse');
      expect(accentAnimation.filter).toContain('drop-shadow');
    });

    test('should animate sound ring pulse', async ({ page }) => {
      const soundRing = page.locator('.sound-ring');
      await expect(soundRing).toBeVisible();

      const ringAnimation = await soundRing.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          animationName: style.animationName,
          animationDuration: style.animationDuration,
          animationIterationCount: style.animationIterationCount
        };
      });

      expect(ringAnimation.animationName).toContain('ring-pulse');
      expect(parseFloat(ringAnimation.animationDuration || '0')).toBeGreaterThan(0);
      expect(ringAnimation.animationIterationCount).toBe('infinite');
    });
  });

  test.describe('Animation Performance', () => {
    test('should maintain 60fps on animations', async ({ page }) => {
      // 监控动画性能
      const frameRates = await page.evaluate(() => {
        return new Promise<number[]>((resolve) => {
          const rates: number[] = [];
          let lastTime = performance.now();
          let frames = 0;

          function measureFrames() {
            frames++;
            const currentTime = performance.now();

            if (currentTime - lastTime >= 1000) {
              rates.push(frames);
              frames = 0;
              lastTime = currentTime;

              if (rates.length < 5) {
                requestAnimationFrame(measureFrames);
              } else {
                resolve(rates);
              }
            } else {
              requestAnimationFrame(measureFrames);
            }
          }

          requestAnimationFrame(measureFrames);
        });
      });

      // 平均帧率应该高于30fps，理想情况是60fps
      const averageFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
      expect(averageFps).toBeGreaterThan(30);
    });

    test('should not block main thread during animations', async ({ page }) => {
      // 测试长时间动画不会阻塞UI
      const startTime = Date.now();

      // 触发一些动画
      await page.hover('.feature-card');
      await page.hover('.action-btn.primary');
      await page.hover('.nav-item');

      const responseTime = Date.now() - startTime;

      // 交互响应时间应该很快
      expect(responseTime).toBeLessThan(1000);
    });

    test('should handle animation interruptions gracefully', async ({ page }) => {
      const featureCard = page.locator('.feature-card').first();

      // 快速移动鼠标，测试动画中断
      await featureCard.hover();
      await page.waitForTimeout(50);
      await page.hover('.feature-card').nth(1);
      await page.waitForTimeout(50);
      await featureCard.hover();
      await page.waitForTimeout(50);
      await page.hover('body'); // 移开鼠标

      // 页面应该仍然响应
      await expect(page.locator('.hero-section')).toBeVisible();
    });
  });

  test.describe('Reduced Motion Support', () => {
    test('should respect prefers-reduced-motion setting', async ({ page }) => {
      // 模拟减少动画偏好设置
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 检查动画是否被禁用
      const animatedElements = [
        '.hero-text',
        '.hero-visual',
        '.visualizer-ring',
        '.sound-bars .bar',
        '.aurora-bg',
        '.wave'
      ];

      for (const selector of animatedElements) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          const animation = await element.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return style.animationName;
          });

          // 动画应该被禁用或设置为none
          expect(animation === 'none' || animation === '').toBe(true);
        }
      }
    });
  });

  test.describe('Animation Accessibility', () => {
    test('should have sufficient color contrast during animations', async ({ page }) => {
      const textElements = page.locator('.hero-title, .hero-subtitle, .section-title');

      for (let i = 0; i < await textElements.count(); i++) {
        const element = textElements.nth(i);
        const styles = await element.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            textShadow: computed.textShadow
          };
        });

        // 检查是否有足够的对比度（基础检查）
        expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');

        // 如果有文本阴影，应该提高可读性
        if (styles.textShadow && styles.textShadow !== 'none') {
          expect(styles.textShadow).toContain('px');
        }
      }
    });

    test('should not cause motion sickness', async ({ page }) => {
      // 检查动画是否过于激烈
      const animations = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const problematicAnimations: string[] = [];

        elements.forEach((el) => {
          const style = window.getComputedStyle(el);
          const animationName = style.animationName;

          if (animationName && animationName !== 'none') {
            // 检查是否有可能引起眩晕的动画
            if (animationName.includes('spin') ||
                animationName.includes('rotate') ||
                animationName.includes('shake')) {
              problematicAnimations.push(animationName);
            }
          }
        });

        return problematicAnimations;
      });

      // 应该没有可能引起眩晕的旋转动画
      expect(animations.length).toBe(0);
    });
  });
});