/**
 * Simple mobile detection utility for the engine
 */
export function detectMobile(): boolean {
    // Check if device has touch capability and small screen
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasSmallScreen = window.innerWidth <= 768; // Common mobile breakpoint
    
    // Additional checks for mobile user agents
    const mobileUserAgents = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileUserAgent = mobileUserAgents.test(navigator.userAgent);
    
    // Consider it mobile if it has touch AND (small screen OR mobile user agent)
    return hasTouchScreen && (hasSmallScreen || isMobileUserAgent);
}