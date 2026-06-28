export function getSubInstruction(parts) {
  // parts = ['sub','rsp','0x28']  OR  ['sub','rsp','[0x00000000]']

  const mnemonic = parts[0];
  const reg = parts[1];
  let arg = parts[2];

  if (mnemonic !== "sub") return null;

  const REG_MAP = {
    rax: 0, rcx: 1, rdx: 2, rbx: 3,
    rsp: 4, rbp: 5, rsi: 6, rdi: 7,
    eax: 0, ecx: 1, edx: 2, ebx: 3,
    esp: 4, ebp: 5, esi: 6, edi: 7,
  };

  const regId = REG_MAP[reg];
  if (regId === undefined) return null;

  // -----------------------------
  // CASE 1: sub r64, [disp32]
  // -----------------------------
  if (arg.startsWith("[") && arg.endsWith("]")) {
    let addr = arg.slice(1, -1); // remove [ ]
    if (addr.startsWith("0x")) addr = parseInt(addr, 16);
    else addr = Number(addr);

    const bytes = [];

    bytes.push("48"); // REX.W
    bytes.push("2B"); // SUB r64, r/m64

    // ModR/M: reg = regId, rm = 5 (absolute disp32)
    const modrm = (regId << 3) | 5;
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

  // -----------------------------
  // CASE 2: sub r64, imm
  // -----------------------------
  let imm = arg;

  if (imm.startsWith("0x")) imm = parseInt(imm, 16);
  else imm = Number(imm);

  const bytes = [];

  // 64-bit → REX.W
  bytes.push("48");

  if (imm <= 0x7F) {
    // imm8 → 83 /5 ib
    bytes.push("83");
    bytes.push((0xE8 | regId).toString(16).padStart(2, "0"));
    bytes.push(imm.toString(16).padStart(2, "0"));
  } else {
    // imm32 → 81 /5 id
    bytes.push("81");
    bytes.push((0xE8 | regId).toString(16).padStart(2, "0"));
    bytes.push(
      (imm & 0xFF).toString(16).padStart(2, "0"),
      ((imm >> 8) & 0xFF).toString(16).padStart(2, "0"),
      ((imm >> 16) & 0xFF).toString(16).padStart(2, "0"),
      ((imm >> 24) & 0xFF).toString(16).padStart(2, "0")
    );
  }

  return bytes.join(" ").toUpperCase();
}

console.log(getSubInstruction(['sub','rsp','40']))//return '48 83 EC 28'
console.log(getSubInstruction(['sub','rsp','[0x00000000]']))