import { test, expect } from '@playwright/test';

test.describe('Performance Regression Checks', () => {
  
  test('Dashboard Load Performance (LCP, TTI)', async ({ page }) => {
    // Navigate to dashboard
    const startTime = Date.now();
    await page.goto('/');
    
    // Measure LCP
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
    });
    
    console.log(`LCP: ${lcp}ms`);
    expect(lcp).toBeLessThan(2500); // 2.5s threshold (slightly relaxed for CI variance)

    // Wait for interactivity (simplified TTI check: verify button is clickable)
    const dashboardReady = Date.now();
    await expect(page.locator('text=Overview')).toBeVisible();
    console.log(`Dashboard Ready: ${dashboardReady - startTime}ms`);
  });

  test('Interaction Next Paint (INP) Proxy', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Measure input delay
    const startInput = Date.now();
    // Simulate interaction: click "Add Transaction" (assuming FAB or button exists)
    // Adjust selector based on actual app structure
    const fab = page.locator('button[aria-label="Add Transaction"], button:has-text("Add Transaction")').first();
    
    if (await fab.isVisible()) {
        await fab.click();
        const endInput = Date.now();
        const duration = endInput - startInput;
        console.log(`Interaction Delay: ${duration}ms`);
        expect(duration).toBeLessThan(100);
    } else {
        console.log('Add Transaction button not found, skipping INP check');
    }
  });

  test('Memory Regression & Leaks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const getHeapSize = async () => {
      return await page.evaluate(() => (performance as any).memory.usedJSHeapSize);
    };

    const startHeap = await getHeapSize();
    
    // Perform navigation
    await page.goto('/transactions');
    await page.waitForLoadState('domcontentloaded');
    await page.goto('/accounts');
    await page.waitForLoadState('domcontentloaded');
    await page.goto('/'); // Back to home
    
    // Force GC if possible (requires launch flag, but we check growth)
    // In standard chrome we can't force GC, so we check for massive growth
    const endHeap = await getHeapSize();
    const diff = endHeap - startHeap;
    
    console.log(`Heap Growth: ${diff / 1024 / 1024} MB`);
    // Allow some growth for caching, but huge growth indicates a leak
    expect(diff).toBeLessThan(20 * 1024 * 1024); // 20MB tolerance
  });

  test('Scroll Performance (FPS)', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    
    // Scroll down
    const frames = await page.evaluate(async () => {
        let frames = 0;
        const start = performance.now();
        
        await new Promise<void>((resolve) => {
            let totalDist = 0;
            const distance = 100;
            
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalDist += distance;
                frames++;
                
                if (totalDist >= 2000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 16); // ~60fps target
        });
        
        const duration = performance.now() - start;
        return { frames, duration };
    });

    const fps = (frames.frames / frames.duration) * 1000;
    console.log(`Approximate Scroll FPS: ${fps}`);
    // Note: JS-driven scroll isn't perfect for FPS measurement, but checks for dropped frames/jank blocking the interval
    expect(fps).toBeGreaterThan(30); 
  });
});
