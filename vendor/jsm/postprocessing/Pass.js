import * as THREE from 'three';
import { Clock } from 'three';

class Pass {
	constructor() {
		this.isPass = true;
		this.enabled = true;
		this.needsSwap = true;
		this.renderToScreen = false;
	}
	setSize() {}
	render() { console.warn('Pass: .render() must be implemented.'); }
	dispose() {}
}

class FullScreenQuad {
	constructor(material) {
		const geo = new Float32Array([-1,-1,0,3,0,-1, 1,-1,0,3,1,0, 1,1,0,3,1,1, 1,-1,0,3,0,1]);
		const idx = new Uint16Array([0,1,2, 0,2,3]);
		const bufGeo = new THREE.BufferGeometry();
		bufGeo.setAttribute('position', new THREE.BufferAttribute(geo, 5, false));
		bufGeo.setIndex(new THREE.BufferAttribute(idx, 1, false));
		this._mesh = new THREE.Mesh(bufGeo, material);
	}
	get material() { return this._mesh.material; }
	render(renderer) {
		if (!this._camera) {
			this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		}
		renderer.render(this._mesh, this._camera);
	}
	dispose() { this._mesh.geometry.dispose(); this._mesh.material.dispose(); }
}

export { Pass, FullScreenQuad };
