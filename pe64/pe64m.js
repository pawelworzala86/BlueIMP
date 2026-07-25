import fs from 'fs';

const FORMAT = [];

function writeUInt32LE(array, value, offset, comment = '') {
  array[offset] = value & 0xff;
  array[offset + 1] = (value >> 8) & 0xff;
  array[offset + 2] = (value >> 16) & 0xff;
  array[offset + 3] = (value >> 24) & 0xff;
  FORMAT.push({ from: offset, to: offset + 3, comment });
}

function writeUInt16LE(array, value, offset, comment = '') {
  array[offset] = value & 0xff;
  array[offset + 1] = (value >> 8) & 0xff;
  FORMAT.push({ from: offset, to: offset + 1, comment });
}

export function generatePrintfExecutable(outputPath) {
  const fileSize = 0x600;
  const exe = new Uint8Array(fileSize);

  // --- 1. DOS HEADER ---
  exe[0] = 0x4D; exe[1] = 0x5A; // 'MZ'
  writeUInt32LE(exe, 0x00000080, 0x3C, 'e_lfanew = 0x80');

  // --- 2. PE HEADER (COFF) ---
  const peOffset = 0x80;
  exe[peOffset] = 0x50; exe[peOffset + 1] = 0x45; // 'PE\0\0'

  writeUInt16LE(exe, 0x8664, peOffset + 4, 'Machine: AMD64 (64-bit)');
  writeUInt16LE(exe, 2, peOffset + 6, 'Number of Sections: 2 (.text, .idata)');
  writeUInt32LE(exe, 0x60000000, peOffset + 8, 'TimeDateStamp');
  writeUInt16LE(exe, 0xF0, peOffset + 20, 'Size of Optional Header (240 bajtów)');
  writeUInt16LE(exe, 0x0022, peOffset + 22, 'Characteristics: EXECUTABLE_IMAGE | LARGE_ADDRESS_AWARE');

  // --- 3. OPTIONAL HEADER (PE32+) ---
  const optOffset = peOffset + 24;
  writeUInt16LE(exe, 0x020B, optOffset, 'Magic: PE32+ (64-bit)');

  writeUInt32LE(exe, 0x00000200, optOffset + 4, 'Size of Code');
  writeUInt32LE(exe, 0x00000200, optOffset + 8, 'Size of Initialized Data');

  writeUInt32LE(exe, 0x00001000, optOffset + 16, 'Address of Entry Point (RVA)');
  writeUInt32LE(exe, 0x00001000, optOffset + 20, 'Base Of Code');

  writeUInt32LE(exe, 0x00400000, optOffset + 24, 'ImageBase (0x00400000)');

  writeUInt32LE(exe, 0x00001000, optOffset + 32, 'Section Alignment (0x1000)');
  writeUInt32LE(exe, 0x00000200, optOffset + 36, 'File Alignment (0x200)');
  writeUInt16LE(exe, 6, optOffset + 40, 'Major OS Version');
  writeUInt16LE(exe, 0, optOffset + 42, 'Minor OS Version');
  writeUInt16LE(exe, 6, optOffset + 48, 'Major Subsystem Version');
  writeUInt16LE(exe, 0, optOffset + 50, 'Minor Subsystem Version');
  writeUInt32LE(exe, 0x00003000, optOffset + 56, 'Size of Image');
  writeUInt32LE(exe, 0x00000200, optOffset + 60, 'Size of Headers');
  writeUInt16LE(exe, 3, optOffset + 68, 'Subsystem: 3 = Windows CUI (Konsola)');

  writeUInt32LE(exe, 0x00100000, optOffset + 72, 'Stack Reserve');
  writeUInt32LE(exe, 0x00001000, optOffset + 80, 'Stack Commit');
  writeUInt32LE(exe, 0x00100000, optOffset + 88, 'Heap Reserve');
  writeUInt32LE(exe, 0x00001000, optOffset + 96, 'Heap Commit');
  writeUInt32LE(exe, 16, optOffset + 108, 'Number of Data Directories');

  // Import Table (RVA 0x2020, size 0x40)
  writeUInt32LE(exe, 0x00002020, optOffset + 120, 'Import Table RVA');
  writeUInt32LE(exe, 0x00000040, optOffset + 124, 'Import Table Size');

  // IAT (RVA 0x2000, size 0x20)
  writeUInt32LE(exe, 0x00002000, optOffset + 208, 'IAT RVA');
  writeUInt32LE(exe, 0x00000020, optOffset + 212, 'IAT Size');

  // --- 4. SECTION HEADERS ---
  let secOffset = optOffset + 240;

  // .text
  exe.set(new TextEncoder().encode('.text\0\0\0'), secOffset);
  writeUInt32LE(exe, 0x00001000, secOffset + 8, 'Virtual Size .text');
  writeUInt32LE(exe, 0x00001000, secOffset + 12, 'Virtual Address .text (RVA 0x1000)');
  writeUInt32LE(exe, 0x00000200, secOffset + 16, 'Size of Raw Data .text');
  writeUInt32LE(exe, 0x00000200, secOffset + 20, 'Pointer to Raw Data .text (0x200)');
  writeUInt32LE(exe, 0x60000020, secOffset + 36, 'CODE | EXECUTE | READ');

  // .idata
  secOffset += 40;
  exe.set(new TextEncoder().encode('.idata\0\0'), secOffset);
  writeUInt32LE(exe, 0x00001000, secOffset + 8, 'Virtual Size .idata');
  writeUInt32LE(exe, 0x00002000, secOffset + 12, 'Virtual Address .idata (RVA 0x2000)');
  writeUInt32LE(exe, 0x00000200, secOffset + 16, 'Size of Raw Data .idata');
  writeUInt32LE(exe, 0x00000400, secOffset + 20, 'Pointer to Raw Data .idata (0x400)');
  writeUInt32LE(exe, 0xC0000040, secOffset + 36, 'INITIALIZED_DATA | READ | WRITE');

  // --- 5. KOD .text ---
  const RVA_TEXT_START = 0x1000;
  const RVA_STRING_HELLO = 0x20C0;

  const IAT_LAYOUT = [
    { dll: 'kernel32.dll', functions: [{ name: 'ExitProcess' }] },
    { dll: 'msvcrt.dll',   functions: [{ name: 'printf' }] },
  ];

  const importEntries = [];
  const importByName = {};

  let nextHintNameRva = 0x2080; // IMAGE_IMPORT_BY_NAME
  let nextIatRva      = 0x2000; // IAT
  let nextDllNameRva  = 0x20A0; // nazwy DLL

  for (const dllEntry of IAT_LAYOUT) {
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

      writeUInt32LE(exe, nextHintNameRva, 0x400 + (nextIatRva - 0x2000),
        `IAT entry for ${dllEntry.dll}!${fn.name}`);

      nextHintNameRva += 0x14;
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

  const ripAfterLea    = RVA_TEXT_START + 0x08 + 7; // 0x100F
  const offsetToHello  = RVA_STRING_HELLO - ripAfterLea;
  writeUInt32LE(code, offsetToHello, 0x0B, 'RIP-rel offset do "Hello World!"');

  const ripAfterPrintf = RVA_TEXT_START + 0x11 + 6; // 0x1017
  const offsetToPrintf = RVA_IAT_PRINTF - ripAfterPrintf;
  writeUInt32LE(code, offsetToPrintf, 0x13, 'RIP-rel offset do IAT.printf');

  const ripAfterExit   = RVA_TEXT_START + 0x19 + 6; // 0x101F
  const offsetToExit   = RVA_IAT_EXIT_PROCESS - ripAfterExit;
  writeUInt32LE(code, offsetToExit, 0x1B, 'RIP-rel offset do IAT.ExitProcess');

  exe.set(code, 0x200);

  // --- 6. .idata ---
  const idataRaw = 0x400;

  // Import Directory @ RVA 0x2020
  const dirOff = idataRaw + 0x20;

  for (let i = 0; i < IAT_LAYOUT.length; i++) {
    const dllEntry = IAT_LAYOUT[i];
    const dirEntryOffset = dirOff + i * 20;

    const dllFuncs = importEntries.filter(e => e.dll === dllEntry.dll);

    const firstIat    = dllFuncs[0].iatRva;
    const dllNameRva  = dllFuncs[0].dllNameRva;

    const iltBaseRva = 0x00002060;
    const iltRva     = iltBaseRva + i * (dllFuncs.length * 0x8);

    writeUInt32LE(exe, iltRva,     dirEntryOffset + 0,  `OriginalFirstThunk (ILT) for ${dllEntry.dll}`);
    writeUInt32LE(exe, 0,          dirEntryOffset + 4,  'TimeDateStamp');
    writeUInt32LE(exe, 0,          dirEntryOffset + 8,  'ForwarderChain');
    writeUInt32LE(exe, dllNameRva, dirEntryOffset + 12, `Name RVA for ${dllEntry.dll}`);
    writeUInt32LE(exe, firstIat,   dirEntryOffset + 16, `FirstThunk (IAT) for ${dllEntry.dll}`);
  }

  // null descriptor
  const nullDescOffset = dirOff + IAT_LAYOUT.length * 20;
  for (let i = 0; i < 5; i++) {
    writeUInt32LE(exe, 0, nullDescOffset + i * 4, 'Null Import Descriptor');
  }

  // ILT @ RVA 0x2060
  let iltOffset = idataRaw + 0x60;
  for (const entry of importEntries) {
    writeUInt32LE(exe, entry.hintNameRva, iltOffset,
      `ILT entry for ${entry.dll}!${entry.name}`);
    iltOffset += 0x8;
  }
  writeUInt32LE(exe, 0, iltOffset, 'ILT terminator');

  const enc = new TextEncoder();

  // IMAGE_IMPORT_BY_NAME
  for (const entry of importEntries) {
    const nameOffset = idataRaw + (entry.hintNameRva - 0x2000);
    exe[nameOffset + 0] = 0x00;
    exe[nameOffset + 1] = 0x00;
    exe.set(enc.encode(`${entry.name}\0`), nameOffset + 2);
  }

  // nazwy DLL
  for (const dllEntry of IAT_LAYOUT) {
    const firstEntry = importEntries.find(e => e.dll === dllEntry.dll);
    if (firstEntry) {
      const dllNameOffset = idataRaw + (firstEntry.dllNameRva - 0x2000);
      exe.set(enc.encode(`${dllEntry.dll}\0`), dllNameOffset);
    }
  }

  // string dla printf
  exe.set(enc.encode('Hello World!\n\0'), idataRaw + 0xC0);

  function uint8ToHexBytes(arr) {
    return Array.from(arr, (value) => value.toString(16).padStart(2, '0').toUpperCase());
  }

  const hexBytes = uint8ToHexBytes(exe);
  const hex = hexBytes.join(' ');

  FORMAT.sort((a, b) => a.from - b.from);

  let txt = '';
  let lastOFFSET = 0;
  for (const FR of FORMAT) {
    const prefixBytes = hexBytes.slice(lastOFFSET, FR.from);
    if (prefixBytes.length > 0) {
      txt += prefixBytes.join(' ');
      txt += '\n';
    }

    const rangeBytes = hexBytes.slice(FR.from, FR.to + 1);
    txt += rangeBytes.join(' ');
    if (FR.comment) {
      txt += '    ;' + FR.comment;
    }
    txt += '\n';
    lastOFFSET = FR.to + 1;
  }

  const suffixBytes = hexBytes.slice(lastOFFSET);
  if (suffixBytes.length > 0) {
    txt += suffixBytes.join(' ');
  }

  fs.writeFileSync('pe64.txt', txt);

  console.log(`txt.length: ${txt.length}`);
  let txtClean = txt.replace(/;[^\n]*/g, '').replace(/\s+/g, '');
  let exeHex = hexBytes.join('');

  console.log(`FORMAT elements: ${FORMAT.length}`);
  console.log(`txtClean.length: ${txtClean.length}`);
  console.log(`exeHex.length: ${exeHex.length}`);

  if (txtClean === exeHex) {
    console.log('✓ Heksy się zgadzają!');
  } else {
    console.log('✗ Heksy się NIE zgadzają!');
    for (let i = 0; i < Math.min(txtClean.length, exeHex.length); i++) {
      if (txtClean[i] !== exeHex[i]) {
        console.log(`Pierwsza różnica na pozycji ${i}`);
        console.log(`pe64.txt: ${txtClean.substring(Math.max(0, i - 20), i + 20)}`);
        console.log(`exe:      ${exeHex.substring(Math.max(0, i - 20), i + 20)}`);
        break;
      }
    }
  }

  fs.writeFileSync(outputPath, exe);
  console.log(`[+] Plik wygenerowany pomyślnie: ${outputPath}`);
}

generatePrintfExecutable('./hello.exe');
