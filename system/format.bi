macro PE64
    hex 4D 5A 00 00 00 00 00 00 00 00 00
    hex 00 00 00 00    ;RIP-rel offset do "Hello World!"
    hex 00 00 00 00
    hex 00 00 00 00    ;RIP-rel offset do IAT.printf
    hex 00 00 00 00
    hex 00 00 00 00    ;RIP-rel offset do IAT.ExitProcess
    hex 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
    hex 80 00 00 00    ;e_lfanew = 0x80
    hex 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 
    hex 50 45 00 00
    hex 64 86    ;Machine: AMD64 (64-bit)
    hex 02 00    ;Number of Sections: 2 (.text, .idata)
    hex 00 00 00 60    ;TimeDateStamp
    hex 00 00 00 00 00 00 00 00
    hex F0 00    ;Size of Optional Header (240 bajtów)
    hex 22 00    ;Characteristics: EXECUTABLE_IMAGE | LARGE_ADDRESS_AWARE
    hex 0B 02    ;Magic: PE32+ (64-bit)
    hex 00 00
    hex 00 02 00 00    ;Size of Code
    hex 00 02 00 00    ;Size of Initialized Data
    hex 00 00 00 00
    hex 00 10 00 00    ;Address of Entry Point (RVA)
    hex 00 10 00 00    ;Base Of Code
    hex 00 00 40 00    ;ImageBase (0x00400000)
    hex 00 00 00 00
    hex 00 10 00 00    ;Section Alignment (0x1000)
    hex 00 02 00 00    ;File Alignment (0x200)
    hex 06 00    ;Major OS Version
    hex 00 00    ;Minor OS Version
    hex 00 00 00 00
    hex 06 00    ;Major Subsystem Version
    hex 00 00    ;Minor Subsystem Version
    hex 00 00 00 00
    hex 00 30 00 00    ;Size of Image
    hex 00 02 00 00    ;Size of Headers
    hex 00 00 00 00
    hex 03 00    ;Subsystem: 3 = Windows CUI (Konsola)
    hex 00 00
    hex 00 00 10 00    ;Stack Reserve
    hex 00 00 00 00
    hex 00 10 00 00    ;Stack Commit
    hex 00 00 00 00
    hex 00 00 10 00    ;Heap Reserve
    hex 00 00 00 00
    hex 00 10 00 00    ;Heap Commit
    hex 00 00 00 00 00 00 00 00
    hex 10 00 00 00    ;Number of Data Directories
    hex 00 00 00 00 00 00 00 00
    hex 00 20 00 00    ;Import Table RVA
    hex 3C 00 00 00    ;Import Table Size
    hex 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
    hex 40 20 00 00    ;IAT RVA
    hex 28 00 00 00    ;IAT Size
    hex 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 2E 74 65 78 74 00 00 00
    hex 00 10 00 00    ;Virtual Size .text
    hex 00 10 00 00    ;Virtual Address .text (RVA 0x1000)
    hex 00 02 00 00    ;Size of Raw Data .text
    hex 00 02 00 00    ;Pointer to Raw Data .text (0x200)
    hex 00 00 00 00 00 00 00 00 00 00 00 00
    hex 20 00 00 60    ;CODE | EXECUTE | READ
    hex 2E 69 64 61 74 61 00 00
    hex 00 10 00 00    ;Virtual Size .idata
    hex 00 20 00 00    ;Virtual Address .idata (RVA 0x2000)
    hex 00 02 00 00    ;Size of Raw Data .idata
    hex 00 04 00 00    ;Pointer to Raw Data .idata (0x400)
    hex 00 00 00 00 00 00 00 00 00 00 00 00
    hex 40 00 00 C0    ;INITIALIZED_DATA | READ | WRITE
    hex 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
    
    OFFSET = 0
end macro