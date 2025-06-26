// Mock chalk to avoid ESM issues
module.exports = {
  default: {
    red: (str) => str,
    green: (str) => str,
    blue: (str) => str,
    yellow: (str) => str,
    gray: (str) => str,
    grey: (str) => str,
  },
  red: (str) => str,
  green: (str) => str,
  blue: (str) => str,
  yellow: (str) => str,
  gray: (str) => str,
  grey: (str) => str,
};