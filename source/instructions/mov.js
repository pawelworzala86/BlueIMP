function getMovInstruction(parts) {
  const mnemonic = parts[0];
  const dst = parts[1];
  let src = parts[2];

  if (mnemonic !== "mov") return null;

  const REG_MAP = {
    rax: 0, rcx: 1, rdx: 2, rbx: 3, rsp: 4, rbp: 5, rsi: 6, rdi: 7,
    eax: 0, ecx: 1, edx: 2, ebx: 3, esp: 4, ebp: 5, esi: 6, edi: 7,
  };

  const isRegDst = REG_MAP[dst] !== undefined;
  const isRegSrc = REG_MAP[src] !== undefined;
  const bytes = [];

  // ============================================================
  // CASE 1: mov r64, r64
  // ============================================================
  if (isRegDst && isRegSrc) {
    const dstId = REG_MAP[dst];
    const srcId = REG_MAP[src];

    // REX.W + 89 /r
    bytes.push("48");
    bytes.push("89");
    const modrm = 0xC0 | (srcId << 3) | dstId;
    bytes.push(modrm.toString(16).padStart(2, "0"));

    return bytes.join(" ").toUpperCase();
  }

  // ============================================================
  // CASE 2: mov r64, [disp32]
  // ============================================================
  if (isRegDst && src.startsWith("[") && src.endsWith("]") && !src.includes("+") && !src.includes("-")) {
    const dstId = REG_MAP[dst];
    let addr = src.slice(1, -1);
    addr = addr.startsWith("0x") ? parseInt(addr, 16) : Number(addr);

    bytes.push("48"); // REX.W
    bytes.push("8B"); // MOV r64, r/m64

    // mod = 00, reg = dstId, r/m = 101 (disp32)
    const modrm = (0x00) | (dstId << 3) | 5;
    bytes.push(modrm.toString(16).padStart(2, "0"));

    bytes.push(
      (addr & 0xFF).toString(16).padStart(2, "0"),
      ((addr >> 8) & 0xFF).toString(16).padStart(2, "0"),
      ((addr >> 16) & 0xFF).toString(16).padStart(2, "0"),
      ((addr >> 24) & 0xFF).toString(16).padStart(2, "0")
    );

    return bytes.join(" ").toUpperCase();
  }

  // ============================================================
  // CASE 3: mov [disp32], r64
  // ============================================================
  if (dst.startsWith("[") && dst.endsWith("]") && !dst.includes("+") && !dst.includes("-") && isRegSrc) {
    const srcId = REG_MAP[src];
    let addr = dst.slice(1, -1);
    addr = addr.startsWith("0x") ? parseInt(addr, 16) : Number(addr);

    bytes.push("48"); // REX.W
    bytes.push("89"); // MOV r/m64, r64

    // mod = 00, reg = srcId, r/m = 101 (disp32)
    const modrm = (0x00) | (srcId << 3) | 5;
    bytes.push(modrm.toString(16).padStart(2, "0"));

    bytes.push(
      (addr & 0xFF).toString(16).padStart(2, "0"),
      ((addr >> 8) & 0xFF).toString(16).padStart(2, "0"),
      ((addr >> 16) & 0xFF).toString(16).padStart(2, "0"),
      ((addr >> 24) & 0xFF).toString(16).padStart(2, "0")
    );

    return bytes.join(" ").toUpperCase();
  }

  // helper: parse [reg ± disp]
  function parseRegDisp(str) {
    const inside = str.slice(1, -1); // bez nawiasów
    // dopuszczamy + i -
    const m = inside.match(/^([a-zA-Z0-9]+)([+-].+)$/);
    if (!m) return null;
    const baseReg = m[1];
    let dispStr = m[2];

    let disp;
    if (dispStr.startsWith("+")) dispStr = dispStr.slice(1);
    // teraz dispStr może być np. "16" albo "0x10" albo "-8"
    if (dispStr.startsWith("0x") || dispStr.startsWith("-0x")) {
      disp = parseInt(dispStr, 16);
    } else {
      disp = Number(dispStr);
    }

    return { baseReg, disp };
  }

  // ============================================================
  // CASE X: mov r64, [reg + disp]
  // ============================================================
  if (isRegDst && src.startsWith("[") && src.endsWith("]") && (src.includes("+") || src.includes("-"))) {
    const parsed = parseRegDisp(src);
    if (!parsed) return null;

    const dstId = REG_MAP[dst];
    const baseId = REG_MAP[parsed.baseReg];
    if (baseId === undefined) return null;
    const disp = parsed.disp;

    bytes.push("48"); // REX.W
    bytes.push("8B"); // MOV r64, r/m64

    let mod = (disp >= -128 && disp <= 127) ? 0x40 : 0x80;

    if (baseId === 4) {
      // base = RSP → wymagany SIB
      const modrm = mod | (dstId << 3) | 4; // r/m = 100 (SIB)
      bytes.push(modrm.toString(16).padStart(2, "0"));

      const sib = (0 << 6) | (4 << 3) | baseId; // scale=0, index=100 (none), base=RSP
      bytes.push(sib.toString(16).padStart(2, "0"));
    } else {
      // normalne adresowanie bez SIB
      const modrm = mod | (dstId << 3) | baseId;
      bytes.push(modrm.toString(16).padStart(2, "0"));
    }

    if (mod === 0x40) {
      bytes.push((disp & 0xFF).toString(16).padStart(2, "0"));
    } else {
      bytes.push(
        (disp & 0xFF).toString(16).padStart(2, "0"),
        ((disp >> 8) & 0xFF).toString(16).padStart(2, "0"),
        ((disp >> 16) & 0xFF).toString(16).padStart(2, "0"),
        ((disp >> 24) & 0xFF).toString(16).padStart(2, "0")
      );
    }

    return bytes.join(" ").toUpperCase();
  }

  // ============================================================
  // CASE Y: mov [reg + disp], r64
  // ============================================================
  if (dst.startsWith("[") && dst.endsWith("]") && (dst.includes("+") || dst.includes("-")) && isRegSrc) {
    const parsed = parseRegDisp(dst);
    if (!parsed) return null;

    const srcId = REG_MAP[src];
    const baseId = REG_MAP[parsed.baseReg];
    if (baseId === undefined) return null;
    const disp = parsed.disp;

    bytes.push("48"); // REX.W
    bytes.push("89"); // MOV r/m64, r64

    let mod = (disp >= -128 && disp <= 127) ? 0x40 : 0x80;

    if (baseId === 4) {
      // base = RSP → SIB
      const modrm = mod | (srcId << 3) | 4; // r/m = 100 (SIB)
      bytes.push(modrm.toString(16).padStart(2, "0"));

      const sib = (0 << 6) | (4 << 3) | baseId; // scale=0, index=100 (none), base=RSP
      bytes.push(sib.toString(16).padStart(2, "0"));
    } else {
      // bez SIB
      const modrm = mod | (srcId << 3) | baseId;
      bytes.push(modrm.toString(16).padStart(2, "0"));
    }

    if (mod === 0x40) {
      bytes.push((disp & 0xFF).toString(16).padStart(2, "0"));
    } else {
      bytes.push(
        (disp & 0xFF).toString(16).padStart(2, "0"),
        ((disp >> 8) & 0xFF).toString(16).padStart(2, "0"),
        ((disp >> 16) & 0xFF).toString(16).padStart(2, "0"),
        ((disp >> 24) & 0xFF).toString(16).padStart(2, "0")
      );
    }

    return bytes.join(" ").toUpperCase();
  }

  // ============================================================
  // CASE 4: mov r64, imm32
  // ============================================================
  if (isRegDst && (/^0x[0-9a-fA-F]+$/.test(src) || /^-?\d+$/.test(src))) {
    const dstId = REG_MAP[dst];
    let imm = src.startsWith("0x") || src.startsWith("-0x") ? parseInt(src, 16) : Number(src);

    // REX.W + B8+rd imm32
    bytes.push("48");
    const opcode = 0xB8 + dstId;
    bytes.push(opcode.toString(16).padStart(2, "0"));

    bytes.push(
      (imm & 0xFF).toString(16).padStart(2, "0"),
      ((imm >> 8) & 0xFF).toString(16).padStart(2, "0"),
      ((imm >> 16) & 0xFF).toString(16).padStart(2, "0"),
      ((imm >> 24) & 0xFF).toString(16).padStart(2, "0")
    );

    return bytes.join(" ").toUpperCase();
  }

  return null;
}

console.log(getMovInstruction(['mov','rcx','rax']));
console.log(getMovInstruction(['mov','rcx','[0x00000000]']));
console.log(getMovInstruction(['mov','[0x00000000]','rcx']));
console.log(getMovInstruction(['mov','rcx','[rax+16]']));
console.log(getMovInstruction(['mov','[rax+16]','rax']));
console.log(getMovInstruction(['mov','[rbp-8]','rax']));

module.exports = getMovInstruction;