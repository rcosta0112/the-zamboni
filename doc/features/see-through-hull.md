# See-through Hull

**Status:** *plan*. Not built. A standalone prototype is a candidate next step (see [`../steps/README.md`](../steps/README.md)).

## Goal

In third person, hide the part of the hull and walls between the camera and the character, like a hole that follows the camera. The camera can then stay outside the hull instead of squeezing into corridors.

## Approach

- A world-space **capsule from the camera to the character**.
- Pixels of "cuttable" materials that fall inside the capsule *and* between camera and character are discarded.
- A **dithered edge** (interleaved gradient noise) gives a soft fade without transparency sorting problems.
- Applies only to tagged surfaces (hull, walls, bulkheads, ceilings), marked `cuttable: true` in Blender (see [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md)). Floors, props and characters stay solid.

## Reference implementation

Written for the WebGL renderer (`MeshStandardMaterial` + `onBeforeCompile`). **The project uses `WebGPURenderer` + TSL, so this must be ported to a TSL node**; the maths stays the same.

```js
const cutout = {
  uPlayer: { value: new THREE.Vector3() },
  uCamPos: { value: new THREE.Vector3() },
  uRadius: { value: 1.2 },
  uSoft:   { value: 0.4 },
  uEnabled:{ value: 1 },
};

export function makeCuttable(material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, cutout);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
      .replace('#include <project_vertex>',
        '#include <project_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uPlayer, uCamPos;
        uniform float uRadius, uSoft, uEnabled;
        varying vec3 vWorldPos;`)
      .replace('void main() {', `void main() {
        if (uEnabled > 0.5) {
          vec3 ab = uPlayer - uCamPos;
          float t = dot(vWorldPos - uCamPos, ab) / dot(ab, ab);
          if (t > 0.0 && t < 0.98) {
            float d = length(vWorldPos - (uCamPos + ab * t));
            float mask = smoothstep(uRadius - uSoft, uRadius, d);
            float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
            if (mask < n) discard;
          }
        }`);
  };
  material.customProgramCacheKey = () => 'cutout';
}
// Every frame: uCamPos = camera position; uPlayer = character position + ~1 m (chest height)
// Note: InstancedMesh needs instanceMatrix folded into vWorldPos.
```

## Details

- **Shadows:** in the WebGL version the shadow depth pass doesn't include the discard, so the hull still blocks light. Check this holds for the TSL version (the cutout must not be applied to the shadow pass). Baked lighting isn't affected.
- **Clean cut edges:** render cuttable walls double-sided and paint back faces a flat dark colour (front-facing test), so the hole's rim looks like a solid cross-section.
- **Indoor and outdoor modes:** trigger volumes switch behaviour.
  - Outdoors: cut off, or only when behind the ship.
  - Indoors: cut on, optionally hiding the ceiling or upper deck entirely (a cutaway view).
  - Transitions: animate the radius from 0 to full over about 0.3 s at doors.
- **Camera:** a follow camera with collision; thanks to the hole it can stay outside the hull.
- **Optional:** oval hole instead of round; constant on-screen size (scale the radius by camera distance); faint glowing rim at the edge.

## Effort

Core effect in an afternoon; polish (edges, mode rules, transitions) a few days.

## Open questions

- Camera style indoors: free orbit, fixed angles, or a cutaway/isometric view? (Also listed in [`../architecture/scope.md`](../architecture/scope.md).)
