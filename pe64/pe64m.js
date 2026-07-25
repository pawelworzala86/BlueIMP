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

  // Import Table Directory (RVA 0x2000)
  // Liczba DLL: 2 + NULL Entry = 3 * 20 bajtów = 60 (0x3C) bajtów
  writeUInt32LE(exe, 0x00002000, optOffset + 120, 'Import Table RVA');
  writeUInt32LE(exe, 0x0000003C, optOffset + 124, 'Import Table Size');

  // IAT Directory (RVA 0x2040)
  // ExitProcess (8) + NULL (8) + printf (8) + malloc (8) + NULL (8) = 40 (0x28) bajtów
  writeUInt32LE(exe, 0x00002040, optOffset + 208, 'IAT RVA');
  writeUInt32LE(exe, 0x00000028, optOffset + 212, 'IAT Size');

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

  // --- Dynamiczne ukierunkowanie danych w .idata (RVA 0x2000 / RAW 0x400) ---
  const IAT_LAYOUT = [
    { dll: 'kernel32.dll', functions: ['ExitProcess'] },
    { dll: 'msvcrt.dll',   functions: ['printf', 'malloc'] },
  ];

  const enc = new TextEncoder();
  const idataRaw = 0x400;
  const idataRva = 0x2000;

  // 1. Rezerwujemy miejsce na Import Directory Table (20 bajtów na każdą DLL + 20 na NULL descriptor)
  let currentRva = idataRva + (IAT_LAYOUT.length + 1) * 20;

  // Mapa na przypisanie adresów IAT dla szybkiego dostępu przy generowaniu kodu
  const iatAddresses = {};

  // Zapisujemy poszczególne sekcje importów
  IAT_LAYOUT.forEach((dllGroup, dllIndex) => {
    const importDescOffset = idataRaw + (dllIndex * 20);

    const iatRva = currentRva;
    const iltRva = iatRva + (dllGroup.functions.length + 1) * 8; // IAT + NULL entry
    currentRva = iltRva + (dllGroup.functions.length + 1) * 8;  // ILT + NULL entry

    // Zapisz wpis w Import Directory Table
    writeUInt32LE(exe, iltRva, importDescOffset + 0, `OriginalFirstThunk (ILT) dla ${dllGroup.dll}`);
    writeUInt32LE(exe, 0,       importDescOffset + 4, 'TimeDateStamp');
    writeUInt32LE(exe, 0,       importDescOffset + 8, 'ForwarderChain');
    // Name RVA przypiszemy po zapisaniu stringów

    // Generuj pola Hint/Name Table dla funkcji i wypełnij IAT / ILT
    dllGroup.functions.forEach((fnName, fnIndex) => {
      const fnNameRva = currentRva;
      const fnNameRaw = idataRaw + (fnNameRva - idataRva);

      // Struktura IMAGE_IMPORT_BY_NAME: Hint (2 B) + Name (ASCIIZ)
      exe[fnNameRaw] = 0x00;
      exe[fnNameRaw + 1] = 0x00;
      exe.set(enc.encode(`${fnName}\0`), fnNameRaw + 2);

      const nameStructSize = 2 + fnName.length + 1;
      const paddedSize = (nameStructSize % 2 !== 0) ? nameStructSize + 1 : nameStructSize; // Align 2
      currentRva += paddedSize;

      // Przypisz wpis do IAT & ILT
      const iatOffset = idataRaw + (iatRva - idataRva) + (fnIndex * 8);
      const iltOffset = idataRaw + (iltRva - idataRva) + (fnIndex * 8);

      writeUInt32LE(exe, fnNameRva, iatOffset, `IAT Entry: ${dllGroup.dll}!${fnName}`);
      writeUInt32LE(exe, fnNameRva, iltOffset, `ILT Entry: ${dllGroup.dll}!${fnName}`);

      iatAddresses[fnName] = iatRva + (fnIndex * 8);
    });

    // Zapisz terminator NULL dla IAT i ILT
    const iatNullOffset = idataRaw + (iatRva - idataRva) + (dllGroup.functions.length * 8);
    const iltNullOffset = idataRaw + (iltRva - idataRva) + (dllGroup.functions.length * 8);
    writeUInt32LE(exe, 0, iatNullOffset, `IAT NULL Terminator dla ${dllGroup.dll}`);
    writeUInt32LE(exe, 0, iltNullOffset, `ILT NULL Terminator dla ${dllGroup.dll}`);

    // Zapisz nazwę DLL
    const dllNameRva = currentRva;
    const dllNameRaw = idataRaw + (dllNameRva - idataRva);
    exe.set(enc.encode(`${dllGroup.dll}\0`), dllNameRaw);
    currentRva += dllGroup.dll.length + 1;

    writeUInt32LE(exe, dllNameRva, importDescOffset + 12, `Name RVA dla ${dllGroup.dll}`);
    writeUInt32LE(exe, iatRva,     importDescOffset + 16, `FirstThunk (IAT) dla ${dllGroup.dll}`);
  });

  // Wpisz NULL Descriptor kończący Import Directory Table
  const nullDescOffset = idataRaw + (IAT_LAYOUT.length * 20);
  for (let i = 0; i < 5; i++) {
    writeUInt32LE(exe, 0, nullDescOffset + i * 4, 'Null Import Descriptor');
  }

  // Zapis ciągu znaków "Hello World!\n"
  const stringHelloRva = (currentRva + 1) & ~1; // Wygląd zerowania wyrównania
  exe.set(enc.encode('Hello World!\n\0'), idataRaw + (stringHelloRva - idataRva));

  // --- 5. KOD .text ---
  const RVA_TEXT_START = 0x1000;

  const code = new Uint8Array([
    0x48, 0x83, 0xEC, 0x28,                         // sub rsp, 40
    0x48, 0x83, 0xE4, 0xF0,                         // and rsp, -16

    0x48, 0x8D, 0x0D, 0x00, 0x00, 0x00, 0x00,       // lea rcx, [RIP + ?]
    0x31, 0xC0,                                     // xor eax, eax

    0xFF, 0x15, 0x00, 0x00, 0x00, 0x00,             // call [RIP + ?] ; printf

    0x31, 0xC9,                                     // xor ecx, ecx

    0xFF, 0x15, 0x00, 0x00, 0x00, 0x00              // call [RIP + ?] ; ExitProcess
  ]);

  const ripAfterLea    = RVA_TEXT_START + 0x08 + 7;
  const offsetToHello  = stringHelloRva - ripAfterLea;
  writeUInt32LE(code, offsetToHello, 0x0B, 'RIP-rel offset do "Hello World!"');

  const ripAfterPrintf = RVA_TEXT_START + 0x11 + 6;
  const offsetToPrintf = iatAddresses['printf'] - ripAfterPrintf;
  writeUInt32LE(code, offsetToPrintf, 0x13, 'RIP-rel offset do IAT.printf');

  const ripAfterExit   = RVA_TEXT_START + 0x19 + 6;
  const offsetToExit   = iatAddresses['ExitProcess'] - ripAfterExit;
  writeUInt32LE(code, offsetToExit, 0x1B, 'RIP-rel offset do IAT.ExitProcess');

  exe.set(code, 0x200);

  // --- Podsumowanie i weryfikacja bajtów ---
  function uint8ToHexBytes(arr) {
    return Array.from(arr, (value) => value.toString(16).padStart(2, '0').toUpperCase());
  }

  const hexBytes = uint8ToHexBytes(exe);
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

  txt = txt.replace(/^/gm,'hex ')
  fs.writeFileSync('pe64.txt', txt);

  let txtClean = txt.replace(/;[^\n]*/g, '').replace(/\s+/g, '');
  let exeHex = hexBytes.join('');

  if (txtClean === exeHex) {
    console.log('✓ Heksy się zgadzają!');
  } else {
    console.log('✗ Heksy się NIE zgadzają!');
  }

  fs.writeFileSync(outputPath, exe);
  console.log(`[+] Plik wygenerowany pomyślnie: ${outputPath}`);
}

generatePrintfExecutable('./hello.exe');