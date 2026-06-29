function getAndInstruction(parts) {
  const mnemonic = parts[0];
  const reg = parts[1];
  let arg = parts[2];

  if (mnemonic !== "and") return null;

  const REG_MAP = {
    rax: 0, rcx: 1, rdx: 2, rbx: 3,
    rsp: 4, rbp: 5, rsi: 6, rdi: 7,
    eax: 0, ecx: 1, edx: 2, ebx: 3,
    esp: 4, ebp: 5, esi: 6, edi: 7,
  };

  const regId = REG_MAP[reg];
  if (regId === undefined) return null;

  // -----------------------------
  // CASE 1: and r64, [disp32]
  // -----------------------------
  if (arg.startsWith("[") && arg.endsWith("]")) {
    let addr = arg.slice(1, -1);

    if (addr.startsWith("0x")) addr = parseInt(addr, 16);
    else addr = Number(addr);

    const bytes = [];

    bytes.push("48"); // REX.W
    bytes.push("23"); // AND r64, r/m64

    const modrm = (regId << 3) | 5; // rm=5 → disp32
    bytes.push(modrm.toString(16).padStart(2, "0"));

    bytes.push(
      (addr & 0xFF).toString(16).padStart(2, "0"),
      ((addr >> 8) & 0xFF).toString(16).padStart(2, "0"),
      ((addr >> 16) & 0xFF).toString(16).padStart(2, "0"),
      ((addr >> 24) & 0xFF).toString(16).padStart(2, "0")
    );

    return bytes.join(" ").toUpperCase();
  }

  // -----------------------------
  // CASE 2: and r64, imm
  // -----------------------------
  let imm = arg;

  // KONWERSJA DO LICZBY — KLUCZOWA POPRAWKA
  if (imm.startsWith("0x")) imm = parseInt(imm, 16);
  else imm = Number(imm);

  const bytes = [];

  bytes.push("48"); // REX.W

  // imm8 → 83 /4 ib
  if (imm >= -128 && imm <= 127) {
    bytes.push("83");
    bytes.push((0xE0 | regId).toString(16).padStart(2, "0"));
    bytes.push((imm & 0xFF).toString(16).padStart(2, "0"));
  }

  // imm32 → 81 /4 id
  else {
    bytes.push("81");
    bytes.push((0xE0 | regId).toString(16).padStart(2, "0"));

    bytes.push(
      (imm & 0xFF).toString(16).padStart(2, "0"),
      ((imm >> 8) & 0xFF).toString(16).padStart(2, "0"),
      ((imm >> 16) & 0xFF).toString(16).padStart(2, "0"),
      ((imm >> 24) & 0xFF).toString(16).padStart(2, "0")
    );
  }

  return bytes.join(" ").toUpperCase();
}

console.log(getAndInstruction(['and','rsp','-16']))
console.log(getAndInstruction(['and','rsp','[0x00000000]']))

module.exports = getAndInstruction