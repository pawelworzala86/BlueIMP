function classifyRegister(reg) {
    reg = reg.toLowerCase();

    const r8 = ["al","cl","dl","bl","spl","bpl","sil","dil"];
    const r16 = ["ax","cx","dx","bx","sp","bp","si","di"];
    const r32 = ["eax","ecx","edx","ebx","esp","ebp","esi","edi"];
    const r64 = ["rax","rcx","rdx","rbx","rsp","rbp","rsi","rdi"];

    if (r8.includes(reg) || /^r\d+b$/.test(reg)) return "r8";
    if (r16.includes(reg) || /^r\d+w$/.test(reg)) return "r16";
    if (r32.includes(reg) || /^r\d+d$/.test(reg)) return "r32";
    if (r64.includes(reg) || /^r\d+$/.test(reg)) return "r64";

    return null;
}

function classifyImmediate(val) {
    const v = Number(val);

    if (v >= -128 && v <= 255) return "imm8";
    if (v >= -32768 && v <= 65535) return "imm16";
    if (v >= -2147483648 && v <= 4294967295) return "imm32";
    return "imm64";
}

function classifyMemory(op) {
    // memory operand → width unknown, infer from other operand
    return "m";
}

function classifyOperand(op) {
    op = op.trim();

    // register
    const reg = classifyRegister(op);
    if (reg) return reg;

    // immediate
    if (/^-?\d+$/.test(op)) {
        return classifyImmediate(op);
    }

    // memory operand
    if (/^\[.*\]$/.test(op)) {
        if(op.length==12){
            return 'r/m64'
        }
        return classifyMemory(op);
    }

    throw new Error("Nieznany operand: " + op);
}

function inferMemoryWidth(memType, otherType) {
    // r/mX width = width of register operand
    if (otherType.startsWith("r")) return "r/m" + otherType.slice(1);
    if (otherType.startsWith("imm")) return "r/m64"; // default for imm → 64-bit mem
    return "m";
}

function parseInstruction(instr) {
    instr = instr.trim().toLowerCase();

    let [mnemonic, op1raw, op2raw] = instr.split(/\s+/);
    //if (!rest) return mnemonic;

    /*const ops = rest.split(",").map(s => s.trim());
    console.log(rest)
    const op1raw = ops[0];
    const op2raw = ops[1];*/
    op1raw = op1raw.replace(',','')

    const op1 = classifyOperand(op1raw);
    const op2 = op2raw ? classifyOperand(op2raw) : null;

    let o1 = op1;
    let o2 = op2;

    // infer memory width
    if (op1 === "m" && op2) o1 = inferMemoryWidth(op1, op2);
    if (op2 === "m" && op1) o2 = inferMemoryWidth(op2, op1);

    if((o1=='r64')&&(o2!='r/m64')){
        o1 = 'r/m64'
    }
    if(o1=='m'){
        o1 = 'rel32'
    }

    if (o2) return `${mnemonic} ${o1}, ${o2}`;
    return `${mnemonic} ${o1}`;
}





console.log(parseInstruction("mov rax, 5"));
// "mov r64, imm8"

console.log(parseInstruction("mov eax, 123456"));
// "mov r32, imm32"

console.log(parseInstruction("mov [rax], rbx"));
// "mov m, r64"

console.log(parseInstruction("push rdi"));
// "push r64"

console.log(parseInstruction("lea rax, [rbx+4]"));
// "lea r64, m"

console.log(parseInstruction("mov rax, [0x00000000]"));
//  mov r64, r/m64

console.log(parseInstruction("call [0x00000000]"));
//  call r/m64

console.log(parseInstruction("lea rcx, [0x00000000]"));
//  call r64, r/m64

module.exports = parseInstruction