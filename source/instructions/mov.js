function getMovInstruction(parts) {
  const mnemonic = parts[0];
  const dst = parts[1];
  let src = parts[2];

  if (mnemonic !== "mov") return null;

  const REG_MAP = {
    rax: 0, rcx: 1, rdx: 2, rbx: 3,
    rsp: 4, rbp: 5, rsi: 6, rdi: 7,
    eax: 0, ecx: 1, edx: 2, ebx: 3,
    esp: 4, ebp: 5, esi: 6, edi: 7,
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

    bytes.push("48"); // REX.W
    bytes.push("89"); // MOV r/m64, r64

    const modrm = 0xC0 | (srcId << 3) | dstId;
    bytes.push(modrm.toString(16).padStart(2, "0"));

    return bytes.join(" ").toUpperCase();
  }

  // ============================================================
  // CASE 2: mov r64, [disp32]
  // ============================================================
  if (isRegDst && src.startsWith("[") && src.endsWith("]") && !src.includes("+")) {
    const dstId = REG_MAP[dst];
    let addr = src.slice(1, -1);

    addr = addr.startsWith("0x") ? parseInt(addr, 16) : Number(addr);

    bytes.push("48");
    bytes.push("8B");

    const modrm = (dstId << 3) | 5;
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
  if (dst.startsWith("[") && dst.endsWith("]") && !dst.includes("+") && isRegSrc) {
    const srcId = REG_MAP[src];
    let addr = dst.slice(1, -1);

    addr = addr.startsWith("0x") ? parseInt(addr, 16) : Number(addr);

    bytes.push("48");
    bytes.push("89");

    const modrm = (srcId << 3) | 5;
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
  // CASE X: mov r64, [reg + disp]
  // ============================================================
  if (isRegDst && src.startsWith("[") && src.endsWith("]") && src.includes("+")) {
    const dstId = REG_MAP[dst];

    let inside = src.slice(1, -1);
    let [baseReg, dispStr] = inside.split("+");

    const baseId = REG_MAP[baseReg];
    if (baseId === undefined) return null;

    let disp = dispStr.startsWith("0x") ? parseInt(dispStr, 16) : Number(dispStr);

    bytes.push("48");
    bytes.push("8B");

    let mod = (disp >= -128 && disp <= 127) ? 0x40 : 0x80;
    const modrm = mod | (dstId << 3) | 4;
    bytes.push(modrm.toString(16).padStart(2, "0"));

    const sib = (0 << 6) | (4 << 3) | baseId;
    bytes.push(sib.toString(16).padStart(2, "0"));

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
  if (dst.startsWith("[") && dst.endsWith("]") && dst.includes("+") && isRegSrc) {
    const srcId = REG_MAP[src];

    let inside = dst.slice(1, -1);
    let [baseReg, dispStr] = inside.split("+");

    const baseId = REG_MAP[baseReg];
    if (baseId === undefined) return null;

    let disp = dispStr.startsWith("0x") ? parseInt(dispStr, 16) : Number(dispStr);

    bytes.push("48");
    bytes.push("89");

    let mod = (disp >= -128 && disp <= 127) ? 0x40 : 0x80;
    const modrm = mod | (srcId << 3) | 4;
    bytes.push(modrm.toString(16).padStart(2, "0"));

    const sib = (0 << 6) | (4 << 3) | baseId;
    bytes.push(sib.toString(16).padStart(2, "0"));

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
  if (isRegDst && (/^0x[0-9a-fA-F]+$/.test(src) || /^\d+$/.test(src))) {
    const dstId = REG_MAP[dst];
    let imm = src.startsWith("0x") ? parseInt(src, 16) : Number(src);

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

module.exports = getMovInstruction