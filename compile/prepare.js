import fs from 'fs'

export function Prepare(code){

    const MACRO = []

    code = code.replace(/macro([\s\S]+?)end macro/gm,match=>{
        let name = match.split(' ')[1].trim()
        let params = match.replace('macro '+name,'').trim().split('\n')[0].split(',').map(t=>t.trim())
        match = match.replace(/^macro (.*)/gm,'')
        match = match.replace(/^end macro/gm,'')
        match = match.trim()
        MACRO.push({name,params,body:match})
        return ''
    })

    //console.log(MACRO)

    for(let MA of MACRO){
        code = code.replace(new RegExp('\\b'+MA.name+'\\b(.*)','gm'),match=>{
            const name = match.split(' ')[0].trim()
            const params = match.replace(name+' ','').split(',').map(t=>t.trim())
            console.log(name,params)
            let result = MA.body
            params.map((param,i)=>{
                result = result.replace(new RegExp('\\b'+MA.params[i]+'\\b','gm'),param)
            })
            return result
        })
    }
    //fs.writeFileSync('./prepared.asm', code)

    //process.exit()

    /*let dataTXT = []
    code = code.replace(/.* db /gm,match=>{
        const name = match.split(' ')[0].trim()
        dataTXT.push(name)
        return match
    })*/

    const REGS = ['rcx','rdx']

    code = code.replace(/invoke .*/gm,match=>{
        let name = match.split(' ')[1].trim()
        let params = match.replace('invoke '+name+'','').split(',').map(t=>t.trim()).filter(p=>p.length)
        name = name.replace(',','').trim()
        let reg = 0
        params = params.map((param,i)=>{
            if(i<4){
                let oper = 'mov'
                if(param.indexOf('addr')>-1){
                    oper = 'lea'
                    param = param.replace('addr','').trim()
                }
                return `${oper} ${REGS[reg++]}, [${param}]`
            }
        })
        return `    sub rsp, 40
    ${params.join('\n')}
    call [${name}]
    add rsp, 40`
    })

    code = code.replace(/rvcall .*/gm,match=>{
        let name = match.split(' ')[1].trim()
        let params = match.replace('rvcall '+name+'','').split(',').map(t=>t.trim()).filter(p=>p.length)
        name = name.replace(',','').trim()
        let reg = 0
        params = params.map((param,i)=>{
            if(param.indexOf('addr')>-1){
                return `lea rax, [${param.replace('addr','').trim()}]\npush rax`
            }
            return `push [${param}]`
        })
        return `    ${params.join('\n')}
    call [${name}]
    add rsp, ${params.length*8}`
    })

    const PROCS = []

    code = code.replace(/proc([\s\S]+?)endp/gm,match=>{
        let name = match.split(' ')[1].trim()
        let lines = match.split('\n')
        let params = lines[0].replace('proc '+name,'').trim().split('\n')[0].split(',').map(t=>t.trim()).filter(p=>p.length)
        match = match.replace(/^proc (.*)/gm,'')
        match = match.replace(/^endp/gm,'')
        match = match.trim()

        params.map((param,i)=>{
            match = match.replace(new RegExp('\\b'+param+'\\b','gm'),match=>{
                return `[rbp + ${(i+1)*8}]`
            })
        })

        PROCS.push({name,params,body:match})
        return `${name}:
    push rbp
    mov rbp, rsp
    sub rsp, ${params.length*8}

    ${match}

    add rsp, ${params.length*8}
    mov rsp, rbp
    pop rbp

    ret`
    })

    console.log(PROCS)

    /*for(let PR of PROCS){
        code = code.replace(new RegExp('\\b'+PR.name+'\\b(.*)','gm'),match=>{
            const name = match.split(' ')[0].trim()
            const params = match.replace(name+' ','').split(',').map(t=>t.trim())
            console.log(name,params)
            let result = PR.body
            params.map((param,i)=>{
                //result = result.replace(new RegExp('\\b'+PR.params[i]+'\\b','gm'),param)
            })
            return result
        })
    }*/

    code = code.replace(/\[\[/gm,'[')
    code = code.replace(/\]\]/gm,']')

    fs.writeFileSync('./prepared.asm', code)

    //process.exit()

    return code
}