module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: ['http://localhost:3000', 'http://localhost:3000/transactions', 'http://localhost:3000/accounts'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'interactive': ['error', { maxNumericValue: 1500 }], // TTI <= 1.5s
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }], // LCP <= 2.0s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.02 }], // CLS <= 0.02
        'total-blocking-time': ['error', { maxNumericValue: 200 }], // Proxy for FID/INP
      },
      preset: 'lighthouse:no-pwa',
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
