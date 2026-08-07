function splitHexToPairs(hex) {
  // usuwamy ewentualne "0x" na początku
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;

  // jeśli długość nieparzysta, dorzucamy leading zero
  const normalized = clean.length % 2 === 1 ? "0" + clean : clean;

  const result = [];
  for (let i = 0; i < normalized.length; i += 2) {
    result.push(normalized.slice(i, i + 2));
  }
  return result;
}

function txtToHex(text) {
  let hex = "";
  for (let i = 0; i < text.length; i++) {
    hex += text.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

function dataToHex(data,length=64){
  data = String(data)
  if(data.startsWith('i') || data.endsWith('u') || data.endsWith('i')){
    const hexValue = numToHex(data, length)
    return hexToLE(hexValue)
  }
    //console.log('dataToHex: ', Number(data))
    if(isNaN(Number(data))){
        const hexValue = txtToHex(data.substring(1, data.length-1))
        return hexValue
    }else{
        const hexValue = numToHex(data, length)
        return hexToLE(hexValue)
    }
}

function floatToHex(value, bitLength) {
  let buffer, view;

  if (bitLength === 32) {
    buffer = new ArrayBuffer(4);
    view = new DataView(buffer);
    view.setFloat32(0, value, false); // false = BE
  } else if (bitLength === 64) {
    buffer = new ArrayBuffer(8);
    view = new DataView(buffer);
    view.setFloat64(0, value, false); // false = BE
  } else {
    throw new Error("bitLength must be 32 or 64 for float/double");
  }

  let hex = "";
  for (let i = 0; i < buffer.byteLength; i++) {
    hex += view.getUint8(i).toString(16).padStart(2, "0");
  }

  return hex;
}

function uintToHex(value, bitLength) {
  // bitLength: 8, 16, 32, 64 ...
  const hexDigits = bitLength / 8 * 2; // ile znaków hex ma wynik
  return value.toString(16).padStart(hexDigits, "0");
}

function intToHex(value, bitLength) {
  const hexDigits = (bitLength / 8) * 2;

  // jeśli liczba ujemna → two's complement
  if (value < 0) {
    const max = BigInt(1) << BigInt(bitLength); // 2^bitLength
    value = max + BigInt(value);                // two's complement
  }

  return value.toString(16).padStart(hexDigits, "0");
}

function hexToLE(hex) {
  // usuń ewentualne "0x"
  hex = hex.replace(/^0x/, "").toLowerCase();

  const bitLength = hex.length / 2

  // ile znaków hex ma wynik
  const hexDigits = (bitLength / 8) * 2;

  // dopaduj do pełnej długości
  hex = hex.padStart(hexDigits, "0");

  // rozbij na bajty
  const bytes = hex.match(/.{2}/g);

  // odwróć kolejność bajtów → LE
  return bytes.reverse().join("");
}

function numToHex(value, bitLength) {
  if(value.endsWith('u')){
    value = value.slice(0, -1)
    return uintToHex(parseInt(value), bitLength)
  }
  if(value.endsWith('i')){
    value = value.slice(0, -1)
    return intToHex(parseInt(value), bitLength)
  }
  if(value.indexOf('.') !== -1){
    return floatToHex(parseFloat(value), bitLength)
  }
  return intToHex(parseInt(value), bitLength)
}

module.exports = {
  uintToHex,
  hexToLE,
  numToHex,
  intToHex,
  dataToHex,
  txtToHex,
  splitHexToPairs,
}