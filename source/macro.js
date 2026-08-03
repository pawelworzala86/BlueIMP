const fs = require('fs')



function tokenize(src) {
    const tokens = [];
    let i = 0;

    while (i < src.length) {
        const c = src[i];

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






const AST = {
    body: [],
}
let activeAST = AST

function pareseMacro(macro){
    let tokens = tokenize(macro);

    for(let i=0; i<tokens.length; i++){
        let token = tokens[i]
        if(token.value=='macro'){
            let block = {
                parent: activeAST,
                type: 'macro',
                body: [],
            }
            activeAST.body.push(block)
            activeAST = block
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