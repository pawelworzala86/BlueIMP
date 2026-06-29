function getXorInstruction(parts) {
  const mnemonic = parts[0];
  const dst = parts[1];
  const src = parts[2];

  if (mnemonic !== "xor") return null;

  const REG_MAP = {
    // 32-bit
    eax: 0, ecx: 1, edx: 2, ebx: 3,
    esp: 4, ebp: 5, esi: 6, edi: 7,

    // 64-bit
    rax: 0, rcx: 1, rdx: 2, rbx: 3,
    rsp: 4, rbp: 5, rsi: 6, rdi: 7,
  };

  const dstId = REG_MAP[dst];
  const srcId = REG_MAP[src];

  if (dstId === undefined || srcId === undefined) return null;

  const bytes = [];

  const is64 = dst.startsWith("r");

  // 64-bit → REX.W
  if (is64) bytes.push("48");

  // XOR opcode
  bytes.push("31");

  // ModR/M: mod=11, reg=src, rm=dst
  const modrm = 0xC0 | (srcId << 3) | dstId;
  bytes.push(modrm.toString(16).padStart(2, "0"));

  return bytes.join(" ").toUpperCase();
}

console.log(getXorInstruction(['xor','eax','eax']));
console.log(getXorInstruction(['xor','rax','rax']));

module.exports = getXorInstruction