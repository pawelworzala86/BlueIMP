import fs from 'fs'

export function Prepare(code){

    const MACRO = []

    code = code.replace(/macro([\s\S]+?)end macro/gm,match=>{
        let name = match.split(' ')[1].trim()
        let params = match.replace('macro '+name,'').trim().split(',').map(t=>t.trim())
        match = match.replace(/^macro (.*)/gm,'')
        match = match.replace(/^end macro/gm,'')
        match = match.trim()
        MACRO.push({name,params,body:match})
        return ''
    })

    /*let dataTXT = []
    code = code.replace(/.* db /gm,match=>{
        const name = match.split(' ')[0].trim()
        dataTXT.push(name)
        return match
    })*/

    const REGS = ['rcx','rdx']

    code = code.replace(/invoke .*/gm,match=>{
        let name = match.split(' ')[1].replace(',','').trim()
        let params = match.replace('invoke '+name+', ','').split(',').map(t=>t.trim())
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

    fs.writeFileSync('./prepared.asm', code)

    return code
}