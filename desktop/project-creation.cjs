const fs=require('node:fs/promises'),path=require('node:path');
const creation=require('../dist/project-creation.js');
async function createProject(parent,input,template){
 const name=creation.name(input),files=creation.files(name,template),base=await fs.realpath(parent),target=path.resolve(base,name);
 if(path.dirname(target)!==base)throw Error('Pasta inválida.');
 await fs.mkdir(target); // Exclusive: never merge into, truncate or replace an existing project.
 for(const [relative,body]of Object.entries(files)){const file=path.join(target,relative);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,body,{flag:'wx'})}
 return target;
}
module.exports={createProject};
