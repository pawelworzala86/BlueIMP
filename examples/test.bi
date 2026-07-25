PE64


start:
    sub rsp, 40
    and rsp, -16 

    lcall [funcA]

    lea rcx, [helloTxt]
    xor eax, eax
    call [printf]

    xor ecx, ecx
    call [ExitProcess]


funcA:
    lea rcx, [helloTxt]
    xor eax, eax
    call [printf]
  ret


ALIGN 512
OFFSET = 4096



hex 4C 20 00 00    ;OriginalFirstThunk (ILT) dla kernel32.dll
hex 00 00 00 00    ;TimeDateStamp
hex 00 00 00 00    ;ForwarderChain
hex 6A 20 00 00    ;Name RVA dla kernel32.dll
hex 3C 20 00 00    ;FirstThunk (IAT) dla kernel32.dll

hex 8F 20 00 00    ;OriginalFirstThunk (ILT) dla msvcrt.dll
hex 00 00 00 00    ;TimeDateStamp
hex 00 00 00 00    ;ForwarderChain
hex BB 20 00 00    ;Name RVA dla msvcrt.dll
hex 77 20 00 00    ;FirstThunk (IAT) dla msvcrt.dll

hex 00 00 00 00    ;Null Import Descriptor
hex 00 00 00 00    ;Null Import Descriptor
hex 00 00 00 00    ;Null Import Descriptor
hex 00 00 00 00    ;Null Import Descriptor
hex 00 00 00 00    ;Null Import Descriptor

ExitProcess:
hex 5C 20 00 00    ;IAT Entry: kernel32.dll!ExitProcess
hex 00 00 00 00
hex 00 00 00 00    ;IAT NULL Terminator dla kernel32.dll
hex 00 00 00 00
hex 5C 20 00 00    ;ILT Entry: kernel32.dll!ExitProcess
hex 00 00 00 00
hex 00 00 00 00    ;ILT NULL Terminator dla kernel32.dll

hex 00 00 00 00 00 00 45 78 69 74 50 72 6F 63 65 73 73 00 6B 65 72 6E 65 6C 33 32 2E 64 6C 6C 00

printf:
hex A7 20 00 00    ;IAT Entry: msvcrt.dll!printf
hex 00 00 00 00
malloc:
hex B1 20 00 00    ;IAT Entry: msvcrt.dll!malloc
hex 00 00 00 00
hex 00 00 00 00    ;IAT NULL Terminator dla msvcrt.dll
hex 00 00 00 00
hex A7 20 00 00    ;ILT Entry: msvcrt.dll!printf
hex 00 00 00 00
hex B1 20 00 00    ;ILT Entry: msvcrt.dll!malloc
hex 00 00 00 00
hex 00 00 00 00    ;ILT NULL Terminator dla msvcrt.dll

hex 00 00 00 00 00 00 70 72 69 6E 74 66 00 00 00 00 6D 61 6C 6C 6F 63 00 00 6D 73 76 63 72 74 2E 64 6C 6C 00 

helloTxt:
hex 48 65 6C 6C 6F 20 57 6F 72 6C 64 21 0A 00

ALIGN 512