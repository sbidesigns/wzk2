import {
	ShaderMaterial,
	UniformsUtils
} from 'three';
import { Pass, FullScreenQuad } from './Pass.js';

class ShaderPass extends Pass {
	constructor(shader, textureID) {
		super();
		this.textureID = (textureID !== undefined) ? textureID : 'tDiffuse';
		if (shader instanceof ShaderMaterial) {
			this.material = shader;
			this.uniforms = shader.uniforms;
		} else {
			this.uniforms = UniformsUtils.clone(shader.uniforms);
			this.material = new ShaderMaterial({
				name: (shader.name !== undefined) ? shader.name : 'unspecified',
				defines: Object.assign({}, shader.defines),
				uniforms: this.uniforms,
				vertexShader: shader.vertexShader,
				fragmentShader: shader.fragmentShader
			});
		}
		this.fsQuad = new FullScreenQuad(this.material);
	}

	render(renderer, writeBuffer, readBuffer) {
		this.uniforms[this.textureID].value = readBuffer.texture;
		if (this.renderToScreen) {
			renderer.setRenderTarget(null);
			this.fsQuad.render(renderer);
		} else {
			renderer.setRenderTarget(writeBuffer);
			if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
			this.fsQuad.render(renderer);
		}
	}

	dispose() { this.material.dispose(); this.fsQuad.dispose(); }
}

export { ShaderPass };
