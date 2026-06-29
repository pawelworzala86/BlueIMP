export function getPushInstruction(parts) {
  // parts = ['push','rax'] OR ['push','0x10'] OR ['push','[0x00000000]']
  const mnemonic = parts[0];
  const arg = parts[1];

  if (mnemonic !== "push") return null;

  const REG_MAP = {
    rax: 0, rcx: 1, rdx: 2, rbx: 3,
    rsp: 4, rbp: 5, rsi: 6, rdi: 7,
    eax: 0, ecx: 1, edx: 2, ebx: 3,
    esp: 4, ebp: 5, esi: 6, edi: 7,
  };

  // ------------------------------------
  // CASE 1: push r64
  // ------------------------------------
  if (REG_MAP[arg] !== undefined) {
    const regId = REG_MAP[arg];
    const opcode = 0x50 + regId;
    return opcode.toString(16).padStart(2, "0").toUpperCase();
  }

  // ------------------------------------
  // CASE 2: push [disp32]
  // ------------------------------------
  if (arg.startsWith("[") && arg.endsWith("]")) {
    let addr = arg.slice(1, -1); // remove [ ]
    if (addr.startsWith("0x")) addr = parseInt(addr, 16);
    else addr = Number(addr);

    const bytes = [];

    // FF /6 → PUSH r/m64
    bytes.push("FF");

    // ModR/M: reg = 6, rm = 5 (absolute disp32)
    const modrm = (6 << 3) | 5;
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

  // ------------------------------------
  // CASE 3: push imm8 / imm32
  // ------------------------------------
  let imm = arg;
  if (imm.startsWith("0x")) imm = parseInt(imm, 16);
  else imm = Number(imm);

  const bytes = [];

  if (imm >= -128 && imm <= 127) {
    // imm8
    bytes.push("6A");
    bytes.push((imm & 0xFF).toString(16).padStart(2, "0"));
  } else {
    // imm32
    bytes.push("68");
    bytes.push(
      (imm & 0xFF).toString(16).padStart(2, "0"),
      ((imm >> 8) & 0xFF).toString(16).padStart(2, "0"),
      ((imm >> 16) & 0xFF).toString(16).padStart(2, "0"),
      ((imm >> 24) & 0xFF).toString(16).padStart(2, "0")
    );
  }

  return bytes.join(" ").toUpperCase();
}

console.log(getPushInstruction(['push','rax']));
// 50

console.log(getPushInstruction(['push','rdi']));
// 57

console.log(getPushInstruction(['push','0x10']));
// 6A 10

console.log(getPushInstruction(['push','0x12345678']));
// 68 78 56 34 12

console.log(getPushInstruction(['push','[0x00000000]']));
// FF 35 00 00 00 00