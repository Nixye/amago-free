const releases='https://github.com/Nixye/amago-free/releases';
async function checkFreeRelease(current,request=fetch){
 try{
  const response=await request('https://api.github.com/repos/Nixye/amago-free/releases/latest',{headers:{Accept:'application/vnd.github+json','User-Agent':'Amago-Free'},signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json(),version=String(data.tag_name||'').replace(/^v/,'');
  if(!/^\d+\.\d+\.\d+$/.test(version)||data.draft||data.prerelease)throw Error('Invalid release');
  const a=version.split('.').map(Number),b=current.split('.').map(Number);let comparison=0;for(let i=0;i<3&&!comparison;i++)comparison=Math.sign(a[i]-b[i]);
  return {status:comparison>0?'available':'current',version,url:releases};
 }catch{return {status:'error',message:'Não foi possível consultar as versões. Tente novamente.',url:releases}}
}
module.exports={checkFreeRelease};
