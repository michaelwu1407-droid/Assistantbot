import { performStartupHealthCheck } from './health-check';

// Initialize application on startup
export async function initializeApp(): Promise<void> {
  try {
    console.log('🚀 Initializing Assistantbot application...');
    
    // Perform comprehensive health checks
    await performStartupHealthCheck();
    
    console.log('✅ Assistantbot application initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Assistantbot application:', error);
    
    // In production, we want to fail fast rather than start with broken dependencies
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    // In development, we can continue but log the error
    console.warn('⚠️ Continuing in development mode despite initialization errors');
  }
}

// Export for use in app initialization
export default initializeApp;
