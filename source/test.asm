sub rsp, 40
and rsp, -16

lea rax, [test]
mov rcx, rax
xor eax, eax

call [printf]

xor ecx, ecx

call [ExitProcess]