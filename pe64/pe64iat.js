import fs from 'fs';

function writeUInt32LE(array, value, offset) {
  array[offset] = value & 0xff;
  array[offset + 1] = (value >> 8) & 0xff;
  array[offset + 2] = (value >> 16) & 0xff;
  array[offset + 3] = (value >> 24) & 0xff;
}

function writeUInt16LE(array, value, offset) {
  array[offset] = value & 0xff;
  array[offset + 1] = (value >> 8) & 0xff;
}

export function generatePrintfExecutable(outputPath) {
  const fileSize = 0x600;
  const exe = new Uint8Array(fileSize);

  // --- 1. DOS HEADER ---
  exe[0] = 0x4D; exe[1] = 0x5A; // 'MZ'
  writeUInt32LE(exe, 0x00000080, 0x3C); // e_lfanew = 0x80

  // --- 2. PE HEADER (COFF) ---
  const peOffset = 0x80;
  exe[peOffset] = 0x50; exe[peOffset + 1] = 0x45; // 'PE\0\0'
  writeUInt16LE(exe, 0x8664, peOffset + 4);     // Machine: AMD64
  writeUInt16LE(exe, 2, peOffset + 6);          // NumberOfSections
  writeUInt32LE(exe, 0x60000000, peOffset + 8); // TimeDateStamp
  writeUInt16LE(exe, 0xF0, peOffset + 20);      // SizeOfOptionalHeader
  writeUInt16LE(exe, 0x0022, peOffset + 22);    // Characteristics

  // --- 3. OPTIONAL HEADER (PE32+) ---
  const optOffset = peOffset + 24;
  writeUInt16LE(exe, 0x020B, optOffset);          // Magic: PE32+

  writeUInt32LE(exe, 0x00000200, optOffset + 4);  // SizeOfCode
  writeUInt32LE(exe, 0x00000200, optOffset + 8);  // SizeOfInitializedData

  writeUInt32LE(exe, 0x00001000, optOffset + 16); // AddressOfEntryPoint (RVA)
  writeUInt32LE(exe, 0x00001000, optOffset + 20); // BaseOfCode

  writeUInt32LE(exe, 0x00400000, optOffset + 24); // ImageBase

  writeUInt32LE(exe, 0x00001000, optOffset + 32); // SectionAlignment
  writeUInt32LE(exe, 0x00000200, optOffset + 36); // FileAlignment

  writeUInt16LE(exe, 6, optOffset + 40);          // MajorOSVersion
  writeUInt16LE(exe, 0, optOffset + 42);          // MinorOSVersion
  writeUInt16LE(exe, 6, optOffset + 48);          // MajorSubsystemVersion
  writeUInt16LE(exe, 0, optOffset + 50);          // MinorSubsystemVersion

  writeUInt32LE(exe, 0x00003000, optOffset + 56); // SizeOfImage
  writeUInt32LE(exe, 0x00000200, optOffset + 60); // SizeOfHeaders

  writeUInt16LE(exe, 3, optOffset + 68);          // Subsystem: CUI

  writeUInt32LE(exe, 0x00100000, optOffset + 72); // StackReserve
  writeUInt32LE(exe, 0x00001000, optOffset + 80); // StackCommit
  writeUInt32LE(exe, 0x00100000, optOffset + 88); // HeapReserve
  writeUInt32LE(exe, 0x00001000, optOffset + 96); // HeapCommit

  writeUInt32LE(exe, 16, optOffset + 108);        // NumberOfRvaAndSizes

  // Data Directory #1: Import Table (RVA 0x2020, size 0x40)
  writeUInt32LE(exe, 0x00002020, optOffset + 120);
  writeUInt32LE(exe, 0x00000040, optOffset + 124);

  // Data Directory #12: IAT (RVA 0x2000, size 0x20)
  writeUInt32LE(exe, 0x00002000, optOffset + 208);
  writeUInt32LE(exe, 0x00000020, optOffset + 212);

  // --- 4. SECTION HEADERS ---
  let secOffset = optOffset + 240;

  // .text
  exe.set(new TextEncoder().encode('.text\0\0\0'), secOffset);
  writeUInt32LE(exe, 0x00001000, secOffset + 8);   // VirtualSize
  writeUInt32LE(exe, 0x00001000, secOffset + 12);  // VirtualAddress
  writeUInt32LE(exe, 0x00000200, secOffset + 16);  // SizeOfRawData
  writeUInt32LE(exe, 0x00000200, secOffset + 20);  // PointerToRawData
  writeUInt32LE(exe, 0x60000020, secOffset + 36);  // Characteristics

  // .idata
  secOffset += 40;
  exe.set(new TextEncoder().encode('.idata\0\0'), secOffset);
  writeUInt32LE(exe, 0x00001000, secOffset + 8);   // VirtualSize
  writeUInt32LE(exe, 0x00002000, secOffset + 12);  // VirtualAddress
  writeUInt32LE(exe, 0x00000200, secOffset + 16);  // SizeOfRawData
  writeUInt32LE(exe, 0x00000400, secOffset + 20);  // PointerToRawData
  writeUInt32LE(exe, 0xC0000040, secOffset + 36);  // Characteristics

  // --- 5. KOD .text (Raw = 0x200, RVA = 0x1000) ---
  const RVA_TEXT_START = 0x1000;
  const RVA_STRING_HELLO = 0x20C0;

  const IAT = [
    { dll: 'kernel32.dll', functions: [{ name: 'ExitProcess' }] },
    { dll: 'msvcrt.dll',   functions: [{ name: 'printf' }] },
  ];

  const importEntries = [];
  const importByName = {};

  let nextHintNameRva = 0x2080; // IMAGE_IMPORT_BY_NAME
  let nextIatRva      = 0x2000; // IAT (IMAGE_THUNK_DATA64)
  let nextDllNameRva  = 0x20A0; // nazwy DLL

  for (const dllEntry of IAT) {
    for (const fn of dllEntry.functions) {
      const entry = {
        dll:        dllEntry.dll,
        name:       fn.name,
        hintNameRva: nextHintNameRva,
        iatRva:      nextIatRva,
        dllNameRva:  nextDllNameRva,
      };
      importEntries.push(entry);
      importByName[fn.name] = entry;

      nextHintNameRva += 0x14; // sizeof(IMAGE_IMPORT_BY_NAME) ~ 2 + len + padding
      nextIatRva      += 0x8;  // 8 bajtów na IMAGE_THUNK_DATA64
    }
    nextDllNameRva += dllEntry.dll.length + 1;
  }

  const RVA_IAT_EXIT_PROCESS = importByName.ExitProcess.iatRva;
  const RVA_IAT_PRINTF       = importByName.printf.iatRva;

  const code = new Uint8Array([
    0x48, 0x83, 0xEC, 0x28,                         // sub rsp, 40
    0x48, 0x83, 0xE4, 0xF0,                         // and rsp, -16

    0x48, 0x8D, 0x0D, 0x00, 0x00, 0x00, 0x00,       // lea rcx, [RIP + ?]
    0x31, 0xC0,                                     // xor eax, eax

    0xFF, 0x15, 0x00, 0x00, 0x00, 0x00,             // call [RIP + ?] ; printf

    0x31, 0xC9,                                     // xor ecx, ecx

    0xFF, 0x15, 0x00, 0x00, 0x00, 0x00              // call [RIP + ?] ; ExitProcess
  ]);

  // RIP-relative
  const ripAfterLea    = RVA_TEXT_START + 0x08 + 7; // 0x100F
  const offsetToHello  = RVA_STRING_HELLO - ripAfterLea;
  writeUInt32LE(code, offsetToHello, 0x0B);

  const ripAfterPrintf = RVA_TEXT_START + 0x11 + 6; // 0x1017
  const offsetToPrintf = RVA_IAT_PRINTF - ripAfterPrintf;
  writeUInt32LE(code, offsetToPrintf, 0x13);

  const ripAfterExit   = RVA_TEXT_START + 0x19 + 6; // 0x101F
  const offsetToExit   = RVA_IAT_EXIT_PROCESS - ripAfterExit;
  writeUInt32LE(code, offsetToExit, 0x1B);

  exe.set(code, 0x200);

  // --- 6. .idata (Raw = 0x400, RVA = 0x2000) ---
  const idataRaw = 0x400;

  // IAT: pod RVAs funkcji
  for (const entry of importEntries) {
    const iatOffset = idataRaw + (entry.iatRva - 0x2000);
    writeUInt32LE(exe, entry.hintNameRva, iatOffset); // low dword = RVA IMAGE_IMPORT_BY_NAME
    // high dword = 0
  }

  // Import Directory (IMAGE_IMPORT_DESCRIPTOR) @ RVA 0x2020 (idatRaw + 0x20)
  const dirOff = idataRaw + 0x20;

  for (let i = 0; i < IAT.length; i++) {
    const dllEntry = IAT[i];
    const dirEntryOffset = dirOff + i * 20;

    const dllFuncs = importEntries.filter(e => e.dll === dllEntry.dll);

    const firstIat    = dllFuncs[0].iatRva;
    const dllNameRva  = dllFuncs[0].dllNameRva;

    // ILT (OriginalFirstThunk) zaczyna się od RVA 0x2060 + przesunięcie per DLL
    const iltBaseRva = 0x00002060;
    const iltRva     = iltBaseRva + i * (dllFuncs.length * 0x8);

    writeUInt32LE(exe, iltRva,     dirEntryOffset + 0);  // OriginalFirstThunk (ILT)
    writeUInt32LE(exe, 0,          dirEntryOffset + 4);  // TimeDateStamp
    writeUInt32LE(exe, 0,          dirEntryOffset + 8);  // ForwarderChain
    writeUInt32LE(exe, dllNameRva, dirEntryOffset + 12); // Name
    writeUInt32LE(exe, firstIat,   dirEntryOffset + 16); // FirstThunk (IAT)
  }

  // null descriptor (terminator)
  const nullDescOffset = dirOff + IAT.length * 20;
  for (let i = 0; i < 5; i++) {
    writeUInt32LE(exe, 0, nullDescOffset + i * 4);
  }

  // ILT (IMAGE_THUNK_DATA64) @ RVA 0x2060 (idatRaw + 0x60)
  let iltOffset = idataRaw + 0x60;
  for (const entry of importEntries) {
    writeUInt32LE(exe, entry.hintNameRva, iltOffset); // low dword = RVA IMAGE_IMPORT_BY_NAME
    iltOffset += 0x8;
  }
  // terminator ILT
  writeUInt32LE(exe, 0, iltOffset);

  const enc = new TextEncoder();

  // IMAGE_IMPORT_BY_NAME
  for (const entry of importEntries) {
    const nameOffset = idataRaw + (entry.hintNameRva - 0x2000);
    exe[nameOffset + 0] = 0x00; // Hint low
    exe[nameOffset + 1] = 0x00; // Hint high
    exe.set(enc.encode(`${entry.name}\0`), nameOffset + 2);
  }

  // nazwy DLL
  for (const dllEntry of IAT) {
    const firstEntry = importEntries.find(e => e.dll === dllEntry.dll);
    if (firstEntry) {
      const dllNameOffset = idataRaw + (firstEntry.dllNameRva - 0x2000);
      exe.set(enc.encode(`${dllEntry.dll}\0`), dllNameOffset);
    }
  }

  // string dla printf
  exe.set(enc.encode('Hello World!\n\0'), idataRaw + 0xC0);

  function uint8ToHexBytes(arr) {
    return Array.from(arr, (value) => value.toString(16).padStart(2, "0").toUpperCase());
  }

  const hexBytes = uint8ToHexBytes(exe);
  const hex = hexBytes.join(' ');

  fs.writeFileSync('./pe64iat.txt', hex);
  fs.writeFileSync(outputPath, exe);

  console.log(`[+] Plik wygenerowany pomyślnie: ${outputPath}`);
}

generatePrintfExecutable('./hello_printf.exe');