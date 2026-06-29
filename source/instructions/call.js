function getCallInstruction(parts) {
  const mnemonic = parts[0];
  let arg = parts[1];

  if (mnemonic !== "call") return null;

  // CASE: call [disp32]
  if (arg.startsWith("[") && arg.endsWith("]")) {
    let addr = arg.slice(1, -1); // remove [ ]

    if (addr.startsWith("0x")) addr = parseInt(addr, 16);
    else addr = Number(addr);

    const bytes = [];

    bytes.push("FF"); // CALL r/m64
    bytes.push("15"); // ModR/M: mod=00, reg=2 (/2), rm=5 (disp32)

    // disp32
    bytes.push(
      (addr & 0xFF).toString(16).padStart(2, "0"),
      ((addr >> 8) & 0xFF).toString(16).padStart(2, "0"),
      ((addr >> 16) & 0xFF).toString(16).padStart(2, "0"),
      ((addr >> 24) & 0xFF).toString(16).padStart(2, "0")
    );

    return bytes.join(" ").toUpperCase();
  }

  return null;
}

console.log(getCallInstruction(['call','[0x00000000]']));

module.exports = getCallInstruction