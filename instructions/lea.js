export function getLeaInstruction(parts) {
  const mnemonic = parts[0];
  const reg = parts[1];
  let arg = parts[2];

  if (mnemonic !== "lea") return null;

  const REG_MAP = {
    rax: 0, rcx: 1, rdx: 2, rbx: 3,
    rsp: 4, rbp: 5, rsi: 6, rdi: 7,
    r8: 8, r9: 9, r10: 10, r11: 11,
    r12: 12, r13: 13, r14: 14, r15: 15
  };

  const regId = REG_MAP[reg];
  if (regId === undefined) return null;

  // -----------------------------
  // CASE: lea r64, [disp32]
  // -----------------------------
  if (arg.startsWith("[") && arg.endsWith("]")) {
    let addr = arg.slice(1, -1);

    if (addr.startsWith("0x")) addr = parseInt(addr, 16);
    else addr = Number(addr);

    const bytes = [];

    bytes.push("48"); // REX.W
    bytes.push("8D"); // LEA r64, r/m64

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

  return null;
}

console.log(getLeaInstruction(['lea','rcx','[0x00000000]']));