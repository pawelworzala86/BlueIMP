

.code
    

        sub rsp, 40
    lea rcx, [test]
mov rdx, [num]
    call [printf]
    add rsp, 40

    
    lea rax, [testT]
    push rax
    call [testProc]
    


        sub rsp, 40
    lea rcx, [testT]
    call [printf]
    add rsp, 40

        sub rsp, 40
    lea rcx, [testT]
    call [printf]
    add rsp, 40

        sub rsp, 40
    
    call [ExitProcess]
    add rsp, 40

startA:
    push rbp
    mov rbp, rsp
    sub rsp, 0

        sub rsp, 40
    lea rcx, [testT]
    call [printf]
    add rsp, 40

    add rsp, 0
    mov rsp, rbp
    pop rbp

    ret




testProc:
    push rbp
    mov rbp, rsp
    sub rsp, 8

    
    
    sub rsp, 40
    mov rcx, [rbp+16]
    call [printf]
    add rsp, 40

    add rsp, 8
    mov rsp, rbp
    pop rbp

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