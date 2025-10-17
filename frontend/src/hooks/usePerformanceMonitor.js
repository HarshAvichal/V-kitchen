import { useEffect } from 'react';

const usePerformanceMonitor = (componentName) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} load time: ${loadTime.toFixed(2)}ms`);
      }
      
      // Track Core Web Vitals
      if (typeof window !== 'undefined' && 'performance' in window) {
        // Track Largest Contentful Paint (LCP)
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log(`LCP for ${componentName}:`, lastEntry.startTime);
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        
        return () => observer.disconnect();
      }
    };
  }, [componentName]);
};

export default usePerformanceMonitor;
