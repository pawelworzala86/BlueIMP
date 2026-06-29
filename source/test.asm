.code
    lea rcx, [test]
    mov rdx, [num]
    call [printf]

    call [startA]
start:

    lea rcx, [testT]
    call [printf]

    lea rcx, [testT]
    call [printf]

    xor ecx, ecx
    call [ExitProcess]

startA:
    lea rcx, [testT]
    call [printf]
    ret

.data
    testT db 'start',0
    test db 'num=%i',0
    num dq 123

.import
    library kernel32,'KERNEL32.DLL',\
        msvcrt,'MSVCRT.DLL'
    import kernel32,\
        ExitProcess,'ExitProcess'
    import msvcrt,\
        printf,'printf'