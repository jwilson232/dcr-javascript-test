/**
 * Converts a country code to its corresponding flag emoji
 * https://dev.to/jorik/country-code-to-flag-emoji-a21
 * @param {string} countryCode - The 2-letter country code
 * @returns {string} - The flag emoji for the country
 */
export function countryToFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

/**  
 * Scales a value to a range between 1 and 100
 * @param {number} value - The value to scale
 * @param {number} min - The minimum value of the range
 * @param {number} max - The maximum value of the range
 * @returns {number} - The scaled value
 */
export function scale(value, min, max) {
  const range = max - min;
  const scaleFactor = range / 100;
  let scaledValue = value / scaleFactor;

  if (scaledValue < 1) {
    scaledValue = 1;
  }

  return (scaledValue / 2 * Math.PI) / 2;
}