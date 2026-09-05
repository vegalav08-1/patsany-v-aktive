import {T} from './graphics.js';
import {RGBELoader} from '../vendor/addons/loaders/RGBELoader.js';
import {EffectComposer} from '../vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from '../vendor/addons/postprocessing/RenderPass.js';
import {SSAOPass} from '../vendor/addons/postprocessing/SSAOPass.js';
import {OutputPass} from '../vendor/addons/postprocessing/OutputPass.js';
import {ShaderPass} from '../vendor/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from '../vendor/addons/shaders/FXAAShader.js';
/** Real HDR image lighting. All files are local and redistribution is CC0. */
export async function lighting(renderer,scene){
 const hdr=await new RGBELoader().loadAsync(new URL('../assets/pbr/daylight.hdr',import.meta.url).href);
 hdr.mapping=T.EquirectangularReflectionMapping;
 const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(hdr);
 scene.environment=environment.texture;scene.environmentIntensity=.42;
 scene.background=hdr;scene.backgroundIntensity=.95;scene.backgroundBlurriness=.025;
 scene.backgroundRotation.y=.65;scene.environmentRotation.y=.65;
 scene.fog=new T.Fog('#d7dfcc',76,164);pmrem.dispose();
 scene.add(new T.HemisphereLight('#d3e6f5','#8b8555',.85));
 const sun=new T.DirectionalLight('#ffe1ac',2.75);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:140});
 sun.shadow.bias=-.000075;sun.shadow.normalBias=.018;sun.shadow.radius=2;
 sun.position.set(-49,36,47);sun.target.position.set(-22,0,24);scene.add(sun,sun.target);
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 return sun;
}
/** SSAO is reserved for high quality; phones keep the same materials and geometry. */
export class Picture {
 constructor(renderer,scene,camera){this.renderer=renderer;this.scene=scene;this.camera=camera;this.composer=null;this.enabled=false;}
 setup(){
  if(this.composer)return;
  const r=this.renderer,ratio=r.getPixelRatio(),target=new T.WebGLRenderTarget(innerWidth*ratio,innerHeight*ratio,{type:T.HalfFloatType});
  this.composer=new EffectComposer(r,target);this.composer.addPass(new RenderPass(this.scene,this.camera));
  const ao=new SSAOPass(this.scene,this.camera,innerWidth*ratio,innerHeight*ratio,16);this.ao=ao;
  ao.kernelRadius=3;ao.minDistance=.0004;ao.maxDistance=.011;
  const old=ao.overrideVisibility.bind(ao);ao.overrideVisibility=()=>{old();this.scene.traverse(o=>{if(o.userData.noAO||o.material?.transparent||o.material?.alphaTest>0)o.visible=false;});};
  this.composer.addPass(ao);this.composer.addPass(new OutputPass());this.fxaa=new ShaderPass(FXAAShader);this.composer.addPass(this.fxaa);
 }
 resize(quality){
  this.enabled=quality==='high';if(this.enabled)this.setup();
  if(this.composer){const ratio=this.renderer.getPixelRatio();this.composer.setPixelRatio(ratio);this.composer.setSize(innerWidth,innerHeight);this.fxaa.material.uniforms.resolution.value.set(1/(innerWidth*ratio),1/(innerHeight*ratio));}
 }
 render(){
  if(this.enabled&&this.composer){
   this.ao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix);
   this.ao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse);
   this.composer.render();
  }else this.renderer.render(this.scene,this.camera);
 }
}
