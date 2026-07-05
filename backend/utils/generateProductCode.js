const crypto = require('crypto');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';

const randomChar = (chars) => chars[crypto.randomInt(chars.length)];

const randomString = (chars, length) => {
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += randomChar(chars);
  }
  return value;
};

const randomProductCode = () => {
  const letterLength = crypto.randomInt(2, 4);
  const numberLength = crypto.randomInt(2, 4);
  return `${randomString(LETTERS, letterLength)}-${randomString(NUMBERS, numberLength)}`;
};

const generateProductCode = async (Product) => {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const productCode = randomProductCode();
    const exists = await Product.exists({ productCode });
    if (!exists) return productCode;
  }

  throw new Error('Could not generate a unique product ID. Please try again.');
};

module.exports = generateProductCode;
