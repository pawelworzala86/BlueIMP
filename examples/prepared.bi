

hex 4D 5A 00 00 00 00 00 00 00 00 00
    hex 00 00 00 00
    hex 00 00 00 00
    hex 00 00 00 00
    hex 00 00 00 00
    hex 00 00 00 00
    hex 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
    hex 80 00 00 00    ;e_lfanew = 0x80
    hex 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 50 45 00 00
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
    hex 20 20 00 00
    hex 3C 00 00 00
    hex 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
    hex 00 20 00 00
    hex 20 00 00 00
    hex 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 2E 74 65 78 74 00 00 00
    hex 00 10 00 00    ;Virtual Size
    hex 00 10 00 00    ;Virtual Address (RVA 0x1000)
    hex 00 02 00 00    ;Size of Raw Data
    hex 00 02 00 00    ;Pointer to Raw Data (0x200)
    hex 00 00 00 00 00 00 00 00 00 00 00 00
    hex 20 00 00 60    ;CODE | EXECUTE | READ
    hex 2E 69 64 61 74 61 00 00
    hex 00 10 00 00    ;Virtual Size
    hex 00 20 00 00    ;Virtual Address (RVA 0x2000)
    hex 00 02 00 00    ;Size of Raw Data
    hex 00 04 00 00    ;Pointer to Raw Data (0x400)
    hex 00 00 00 00 00 00 00 00 00 00 00 00
    hex 40 00 00 C0    ;INITIALIZED_DATA | READ | WRITE
    hex 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
    
    OFFSET = 0


sub rsp, 40


    sub rsp, 40
    lea rcx, [helloTxt]
    call [printf]
    add rsp, 40

    sub rsp, 40
    
    call [ExitProcess]
    add rsp, 40






ALIGN 512

OFFSET = 4096


dd 0,0,0,4096+kernel_name,4096+kernel_table
dd 0,0,0,4096+msvcrt_name,4096+msvcrt_table
dd 0,0,0,0,0

kernel_table:
ExitProcess:
 dq 4096+_ExitProcess
dq 0
msvcrt_table:
printf:
 dq 4096+_printf
dq 0

kernel_name:
 db 'KERNEL32.DLL',0
msvcrt_name:
 db 'MSVCRT.DLL',0

_ExitProcess:
 dw 0
db 'ExitProcess',0
_printf:
 dw 0
db 'printf',0



helloTxt:
db 'Hello World!!!',0
hex 00


ALIGN 512