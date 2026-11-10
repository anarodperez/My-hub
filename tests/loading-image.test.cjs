const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function render(reduced=false){
 const source=fs.readFileSync('src/components/loading-image.tsx','utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
 const state=['loading'];
 const context={exports:{},state,useState:()=>[state[0],value=>state[0]=value],usePalette:()=>({soft:'#eee',muted:'#666',accent:'#705080'}),useReducedMotion:()=>reduced,
  View:'View',Image:'Image',ImageSquareIcon:'Icon',ActivityIndicator:'Spinner',StyleSheet:{absoluteFill:{position:'absolute'}},require:()=>({jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})})};
 vm.createContext(context);vm.runInContext(ts.transpileModule(source+'\nglobalThis.render=ImageFrame;', {compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context);
 return {state,render:context.render};
}
test('la espera sigue visible hasta que la foto se muestra; conserva callbacks y errores',()=>{
 const h=render();let displayed=0,failed=0;
 let tree=h.render({source:'photo',onDisplay:()=>displayed++,onError:()=>failed++});
 assert.ok(tree.props.children[0]);const image=tree.props.children[1];
 assert.equal(image.props.cachePolicy,'memory-disk');assert.equal(image.props.transition,180);
 image.props.onDisplay();assert.equal(displayed,1);
 tree=h.render({source:'photo'});assert.equal(tree.props.children[0],false);
 image.props.onError({error:'offline'});assert.equal(failed,1);assert.equal(h.state[0],'error');
 tree=h.render({source:'photo'});assert.ok(tree.props.children[0]);
});
test('movimiento reducido elimina spinner y transición',()=>{
 const tree=render(true).render({source:'photo'});
 assert.equal(tree.props.children[1].props.transition,0);
 assert.equal(tree.props.children[0].props.children[1],false);
});
