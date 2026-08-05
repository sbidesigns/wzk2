export const LuminosityHighPassShader = {
	name: 'LuminosityHighPassShader',
	uniforms: {
		'tDiffuse': { value: null },
		'luminosityThreshold': { value: 0.8 },
		'luminositySmoothing': { value: 0.3 },
		'smoothWidth': { value: 1.0 },
		'defaultOpacity': { value: 0.0 }
	},
	vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
	fragmentShader: 'uniform sampler2D tDiffuse; uniform float luminosityThreshold; uniform float luminositySmoothing; uniform float defaultOpacity; varying vec2 vUv; void main() { vec4 texel = texture2D(tDiffuse, vUv); vec3 luma = vec3(0.299, 0.587, 0.114); float v = dot(texel.xyz, luma); float alpha = smoothstep(luminosityThreshold, luminosityThreshold + luminositySmoothing, v); texel.a = mix(defaultOpacity, 1.0, alpha); gl_FragColor = texel; }'
};
