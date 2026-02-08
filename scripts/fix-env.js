const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');

try {
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found at ' + envPath);
    process.exit(1);
  }

  // Read file
  let content = fs.readFileSync(envPath, 'utf8');

  // Normalize newlines to LF
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = content.split('\n');
  let databaseUrlValue = null;
  let hasDirectUrl = false;
  const cleanLines = [];

  for (let line of lines) {
    // Keep original lines but track keys
    const trimmed = line.trim();
    
    if (trimmed.startsWith('DATABASE_URL=')) {
      // Extract value, handling potential multiple '=' signs in the connection string
      const parts = trimmed.split('=');
      parts.shift(); // remove 'DATABASE_URL'
      databaseUrlValue = parts.join('=');
    }
    
    if (trimmed.startsWith('DIRECT_URL=')) {
      hasDirectUrl = true;
    }
    
    cleanLines.push(line);
  }

  if (!databaseUrlValue) {
    console.error('Error: DATABASE_URL not found in .env');
    process.exit(1);
  }

  if (hasDirectUrl) {
    console.log('DIRECT_URL already exists in .env. No changes made.');
  } else {
    // Ensure we don't have double newlines at the end before appending
    while (cleanLines.length > 0 && cleanLines[cleanLines.length - 1].trim() === '') {
      cleanLines.pop();
    }
    
    cleanLines.push(`DIRECT_URL=${databaseUrlValue}`);
    
    // Write back with consistent newlines
    const newContent = cleanLines.join('\n') + '\n';
    fs.writeFileSync(envPath, newContent, 'utf8');
    console.log('Success: Added DIRECT_URL to .env');
  }

} catch (error) {
  console.error('Failed to fix .env:', error);
  process.exit(1);
}
