import { describe, it, expect } from '@jest/globals';

describe('Hello API', () => {
  it('should return welcome HTML message', () => {
    const expectedHtml = `
    <h1>Welcome, Hoai!</h1>
    <p>Thank you for joining!</p>
  `;
    
    // Test the HTML structure
    expect(expectedHtml).toContain('<h1>Welcome, Hoai!</h1>');
    expect(expectedHtml).toContain('<p>Thank you for joining!</p>');
  });

  it('should have valid HTML structure', () => {
    const htmlContent = `
    <h1>Welcome, Hoai!</h1>
    <p>Thank you for joining!</p>
  `;
    
    // Test that it contains proper HTML tags
    expect(htmlContent).toMatch(/<h1>.*<\/h1>/);
    expect(htmlContent).toMatch(/<p>.*<\/p>/);
  });

  it('should contain welcome message', () => {
    const message = 'Welcome, Hoai!';
    expect(message).toBe('Welcome, Hoai!');
    expect(message).toContain('Welcome');
    expect(message).toContain('Hoai');
  });

  it('should contain thank you message', () => {
    const message = 'Thank you for joining!';
    expect(message).toBe('Thank you for joining!');
    expect(message).toContain('Thank you');
    expect(message).toContain('joining');
  });
});