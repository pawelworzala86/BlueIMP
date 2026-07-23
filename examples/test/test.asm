macro testMacro paramA, paramB
    lea rcx, [paramA]
    mov rdx, [paramB]
end macro

.code

    invoke printf, addr testDataA

    invoke printf, addr testDataA

    call [testPr]

    invoke printf, addr testDataA

    invoke ExitProcess

testPr:
    push rbp
    mov rbp, rsp
    sub rsp, 8

    ;lea rax, [decl1]
    ;mov [rbp-8], rax

    ;lea rcx, [testT]
    ;mov rax, [rcx+0];  [rbp+16]

    invoke printf, addr decl1

    add rsp, 8
    mov rsp, rbp
    pop rbp

    ret

.data
    testDataA db 'start',0
    testT db 'hello',0
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