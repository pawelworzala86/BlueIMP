macro testMacro paramA, paramB
    lea rcx, [paramA]
    mov rdx, [paramB]
end macro

.code
    ;testMacro test, num

    invoke printf, addr test, num

    rvcall testProc, addr testT
    ;lea rax, [testT]
    ;push rax
    ;call [testProc]
    ;add rsp, 16

    ;lea rax, [decl1]
    ;mov [rbp-8], rax

    invoke printf, addr testT

    invoke printf, addr testT

    invoke ExitProcess

startA:
    push rbp
    mov rbp, rsp
    sub rsp, 0

    invoke printf, addr testT

    add rsp, 0
    mov rsp, rbp
    pop rbp

    ret

proc testProc paramA
    lea rax, [decl1]
    mov [rbp-8], rax

    invoke printf, [rbp-8]
endp
testPr:
    push rbp
    mov rbp, rsp
    sub rsp, 8

    lea rax, [decl1]
    mov [rbp-8], rax

    ;lea rcx, [testT]
    ;mov rax, [rcx+0];  [rbp+16]
    sub rsp, 40
    mov rcx, [rbp-8]
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
    decl1 db '!!',0

.import
    library kernel32,'KERNEL32.DLL',\
        msvcrt,'MSVCRT.DLL'
    import kernel32,\
        ExitProcess,'ExitProcess'
    import msvcrt,\
        printf,'printf'