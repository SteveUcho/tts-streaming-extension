/**
 * Text processor for TTS
 * - Removes markdown formatting
 * - Cleans up URLs
 * - Removes special characters that don't read well
 */
export class TextProcessor {
  /**
   * Process text for TTS
   * @param {string} text - The text to process
   * @returns {string} - The processed text
   */
  static process(text: string): string {
    if (!text) return '';
    
    let processedText = text;
    
    // Remove markdown headers
    processedText = processedText.replace(/^#{1,6}\s+(.+)$/gm, '$1');
    
    // Remove markdown bold/italic
    processedText = processedText.replace(/(\*\*|__)(.*?)\1/g, '$2');
    processedText = processedText.replace(/(\*|_)(.*?)\1/g, '$2');
    
    // Remove markdown code blocks
    processedText = processedText.replace(/```[\s\S]*?```/g, 'code block omitted');
    processedText = processedText.replace(/`([^`]+)`/g, '$1');
    
    // Remove markdown links but keep the text
    processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    
    // Process URLs
    processedText = this.processUrls(processedText);
    
    // Remove special characters that don't read well
    processedText = processedText.replace(/[|*~`]/g, ' ');
    
    // Remove excessive whitespace
    processedText = processedText.replace(/\s+/g, ' ').trim();
    
    // Remove markdown list markers
    processedText = processedText.replace(/^[\s-]*[-*+]\s+/gm, '');
    processedText = processedText.replace(/^\s*\d+\.\s+/gm, '');
    
    // Remove HTML tags
    processedText = processedText.replace(/<[^>]*>/g, '');
    
    // Replace common symbols with words
    processedText = processedText.replace(/&/g, ' and ');
    processedText = processedText.replace(/\$/g, ' dollars ');
    processedText = processedText.replace(/%/g, ' percent ');
    processedText = processedText.replace(/\^/g, ' ');
    
    // Replace multiple dots with a single period
    processedText = processedText.replace(/\.{2,}/g, '.');
    
    return processedText;
  }
  
  /**
   * Process URLs in text
   * @param {string} text - The text containing URLs
   * @returns {string} - Text with processed URLs
   */
  static processUrls(text: string) {
    // Regular expression for URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    return text.replace(urlRegex, (url) => {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        // Extract the domain name without subdomains
        let domainName = domain.split('.');
        let finalDomainName: string = "";
        if (domainName.length > 2) {
          // Handle cases like www.example.com
          if (domainName[0] === 'www') {
            domainName = domainName.slice(1);
          }
          // Get the main domain part
          finalDomainName = domainName.at(-2) || "";
        } else {
          // Handle cases like example.com
          finalDomainName = domainName[0];
        }
        
        // Capitalize first letter
        finalDomainName = finalDomainName.charAt(0).toUpperCase() + finalDomainName.slice(1);
        
        return `[${finalDomainName} dot ${domain.split('.').pop()} link]`;
      } catch (e) {
        // If URL parsing fails, return a generic placeholder
        return '[web link]';
      }
    });
  }
}
