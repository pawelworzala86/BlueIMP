function getJeInstruction(parts) {
    const mnemonic = parts[0];
    if (mnemonic !== "je") return null;

    let arg = parts[1];

    // SPECJALNY CASE: label → zawsze 4 bajty 0
    if (arg === "0x00000000") {
        return "0F 84 00 00 00 00";
    }

    // parse offset
    let off;
    if (arg.startsWith("0x")) off = parseInt(arg, 16);
    else off = Number(arg);

    const bytes = [];

    // short jump (rel8)
    if (off >= -128 && off <= 127) {
        bytes.push("74");
        bytes.push((off & 0xFF).toString(16).padStart(2, "0"));
        return bytes.join(" ").toUpperCase();
    }

    // near jump (rel32)
    bytes.push("0F", "84");
    bytes.push(
        (off & 0xFF).toString(16).padStart(2, "0"),
        ((off >> 8) & 0xFF).toString(16).padStart(2, "0"),
        ((off >> 16) & 0xFF).toString(16).padStart(2, "0"),
        ((off >> 24) & 0xFF).toString(16).padStart(2, "0")
    );

    return bytes.join(" ").toUpperCase();
}

module.exports = getJeInstruction;