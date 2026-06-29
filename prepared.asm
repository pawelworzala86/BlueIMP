.code
    
    
    
    
    
        sub rsp, 40
    lea rcx, [test]
mov rdx, [num]
    call [printf]
    add rsp, 40

    call startA
start:

    sub rsp, 40
    lea rcx, [testT]
    call [printf]
    add rsp, 40

    sub rsp, 40
    lea rcx, [testT]
    call [printf]
    add rsp, 40

    sub rsp, 40
    xor ecx, ecx
    call [ExitProcess]

startA:
    sub rsp, 40
    lea rcx, [testT]
    call [printf]
    add rsp, 40
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