function getPopInstruction(parts) {
  // parts = ['pop','rax'] OR ['pop','[0x00000000]']
  const mnemonic = parts[0];
  const reg = parts[1];

  if (mnemonic !== "pop") return null;

  const REG_MAP = {
    rax: 0, rcx: 1, rdx: 2, rbx: 3,
    rsp: 4, rbp: 5, rsi: 6, rdi: 7,
    eax: 0, ecx: 1, edx: 2, ebx: 3,
    esp: 4, ebp: 5, esi: 6, edi: 7,
  };

  // ------------------------------------
  // CASE 1: pop r64
  // ------------------------------------
  if (!reg.startsWith("[")) {
    const regId = REG_MAP[reg];
    if (regId === undefined) return null;

    // POP r64 → opcode 58+rd
    const opcode = 0x58 + regId;
    return opcode.toString(16).padStart(2, "0").toUpperCase();
  }

  // ------------------------------------
  // CASE 2: pop [disp32]
  // ------------------------------------
  let addr = reg.slice(1, -1); // remove [ ]
  if (addr.startsWith("0x")) addr = parseInt(addr, 16);
  else addr = Number(addr);

  const bytes = [];

  // POP r/m64 → 8F /0
  bytes.push("8F");

  // ModR/M: reg = 0, rm = 5 (absolute disp32)
  const modrm = (0 << 3) | 5;
  bytes.push(modrm.toString(16).padStart(2, "0"));

  // disp32
  bytes.push(
    (addr & 0xFF).toString(16).padStart(2, "0"),
    ((addr >> 8) & 0xFF).toString(16).padStart(2, "0"),
    ((addr >> 16) & 0xFF).toString(16).padStart(2, "0"),
    ((addr >> 24) & 0xFF).toString(16).padStart(2, "0")
  );

  return bytes.join(" ").toUpperCase();
}

console.log(getPopInstruction(['pop','rax']));
// 58
console.log(getPopInstruction(['pop','rdi']));
// 5F
console.log(getPopInstruction(['pop','[0x00000000]']));
// 8F 05 00 00 00 00

module.exports = getPopInstruction