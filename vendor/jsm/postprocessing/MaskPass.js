import { Pass } from './Pass.js';

class MaskPass extends Pass {
	constructor(scene, camera) {
		super();
		this.scene = scene;
		this.camera = camera;
		this.clear = true;
		this.needsSwap = false;
		this.inverse = false;
	}

	render(renderer, writeBuffer, readBuffer) {
		const context = renderer.getContext();
		const state = renderer.state;
		state.buffers.color.setMask(false);
		state.buffers.depth.setMask(false);
		state.buffers.stencil.setTest(true);
		state.buffers.stencil.setFunc(context.ALWAYS, 1, 0xffffffff);
		if (this.inverse) {
			state.buffers.stencil.setOp(context.KEEP, context.KEEP, context.INVERT);
		} else {
			state.buffers.stencil.setOp(context.KEEP, context.KEEP, context.REPLACE);
		}
		renderer.setRenderTarget(readBuffer);
		if (this.clear) renderer.clear();
		renderer.render(this.scene, this.camera);
		state.buffers.color.setMask(true);
		state.buffers.depth.setMask(true);
		state.buffers.stencil.setTest(false);
	}
}

class ClearMaskPass extends Pass {
	constructor() {
		super();
		this.needsSwap = false;
	}
	render(renderer) {
		const context = renderer.getContext();
		renderer.state.buffers.stencil.setFunc(context.EQUAL, 1, 0xffffffff);
	}
}

export { MaskPass, ClearMaskPass };
