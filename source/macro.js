const fs = require('fs')



function tokenize(src) {
    const tokens = [];
    let i = 0;

    while (i < src.length) {
        const c = src[i];

        // new line literal
        if (/\n/.test(c)) {
            tokens.push({
                type: 'newLine',
                value: '\n'
            });
            i++; // skip closing `
            continue;
        }

        // whitespace
        if (/\s/.test(c)) {
            i++;
            continue;
        }

        // backtick literal
        if (c === '`') {
            let start = ++i;
            while (i < src.length && src[i] !== '`') i++;
            tokens.push({
                type: 'literal',
                value: src.slice(start, i)
            });
            i++; // skip closing `
            continue;
        }

        // identifier / keyword
        if (/[A-Za-z_]/.test(c)) {
            let start = i;
            while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) i++;
            tokens.push({
                type: 'id',
                value: src.slice(start, i)
            });
            continue;
        }

        // number
        if (/[0-9]/.test(c)) {
            let start = i;
            while (i < src.length && /[0-9]/.test(src[i])) i++;
            tokens.push({
                type: 'num',
                value: src.slice(start, i)
            });
            continue;
        }

        // two‑char operators (e.g. !=)
        if (src.slice(i, i+2) === '!=') {
            tokens.push({ type: 'op', value: '!=' });
            i += 2;
            continue;
        }

        // single‑char operators
        if (/[,:\(\)]/.test(c)) {
            tokens.push({ type: 'op', value: c });
            i++;
            continue;
        }

        // fallback — single char
        tokens.push({ type: 'char', value: c });
        i++;
    }

    return tokens;
}






const MACRO = {}

const AST = {
    body: [],
}
let activeAST = AST

function pareseMacro(macro){
    let tokens = tokenize(macro);

    let iff = false
    for(let i=0; i<tokens.length; i++){
        let token = tokens[i]
        if(token.value=='if'){
            let left = tokens[++i].value
            let operation = tokens[++i].value
            let right = tokens[++i].value
            let block = {
                parent: activeAST,
                type: 'if',
                left,
                operation,
                right,
                body: [],
            }
            activeAST.body.push(block)
            activeAST = block
            let then = {
                parent: activeAST,
                type: 'then',
                body: [],
            }
            activeAST.body.push(then)
            activeAST = then
            continue
            iff = true
        }
        if(token.value=='macro'){
            let name = tokens[++i].value
            let params = []
            while(tokens[i++].type!='newLine'){
                if(tokens[i].type=='id'){
                    params.push(tokens[i].value)
                }
            }
            let block = {
                parent: activeAST,
                type: 'macro',
                name,
                params,
                body: [],
            }
            MACRO[name] = block
            activeAST.body.push(block)
            activeAST = block
            i--
            continue
        }
        if(iff&&(token.value=='else')){
            let elseD = {
                parent: activeAST,
                type: 'else',
                body: [],
            }
            activeAST.body.parent.push(elseD)
            activeAST = elseD
        }
        if((token.value=='end')&&(tokens[i+1].value=='if')){
            activeAST = activeAST.parent.parent
            i+=1
            iff = false
            continue
        }
        if((token.value=='end')&&(tokens[i+1].value=='macro')){
            activeAST = activeAST.parent
            i+=1
            continue
        }
        activeAST.body.push(token)
    }

    return ''
}

function clearParents(node){
    if(node.parent){
        delete node.parent
    }
    for(let child of node.body){
        if(child.parent){
            clearParents(child)
        }
    }
}

const macro = fs.readFileSync('.\\examples\\macro.bi').toString()

pareseMacro(macro)

clearParents(AST)
fs.writeFileSync('.\\examples\\macro.bi.ast', JSON.stringify(AST,null,4))
console.log(AST)


let RESULT = ''
function runMacro(node=AST){
    for(let i=0; i<node.body.length; i++){
        let child = node.body[i]
        if(child.type=='macro'){
            console.log('macro...',child.name,child.params)
        }
        if(child.type=='newLine'){
            RESULT += '\n'
            continue
        }
        if(child.type=='id'){
            if(MACRO[child.value]){
                const params = []
                while(node.body[++i]&&(node.body[i].type!='newLine')){
                    if(node.body[i]&&node.body[i].type=='id'){
                        params.push(node.body[i].value)
                    }
                }
                console.log('call macro...',child.value, params)
                runMacro(MACRO[child.value])
                i++
                continue
            }else{
                console.log('id...',child.value)
            }
        }
        if(child.type=='if'){
            console.log('if...',child.type)
            let left = child.left
            let operation = child.operation
            let right = child.right
            if(operation=='!='){
                if(left!=right){
                    runMacro(child.body[0])
                }else if(child.body[1]){
                    runMacro(child.body[1])
                }
            }
            if(operation=='>='){
                if(left>=right){
                    runMacro(child.body[0])
                }else if(child.body[1]){
                    runMacro(child.body[1])
                }
            }
            if(operation=='<='){
                if(left<=right){
                    runMacro(child.body[0])
                }else if(child.body[1]){
                    runMacro(child.body[1])
                }
            }
            if(operation=='=='){
                if(left==right){
                    runMacro(child.body[0])
                }else if(child.body[1]){
                    runMacro(child.body[1])
                }
            }
            continue
        }
        //if(child.type=='literal'){
        //    RESULT+=child.value+'\n'
        //}
        console.log('id...',child.type,child.value)
        RESULT+=child.value+' '
    }
}

runMacro()

console.log('RESULT:\n',RESULT)