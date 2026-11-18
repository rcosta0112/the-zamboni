// The ice from the owner's `Penguins Scene 1.01.blend` (material `Ice 3`), without its subsurface
// scattering (plan: doc/plans/features/ice-and-water.md, pass 1). Not in a scene yet: the dev page
// water-test.html shows it on icebergs in the pond (src/water-page.ts).
//
// In the file's render the scattering does three things: it softens the shading between the low-poly
// faces, turns the faces away from the sun blue, and leaves the rest nearly white. The stand-in:
// - **wrapped light**: each light also reaches past the lit side, by `wrap`, and that extra light is
//   tinted (blue): the soft edge and the blue shadow side, a few instructions per light;
// - **blue at glancing angles** (a rim by the view): the thin edges.
// No noise (owner, 2026-11-18: the file's noises cost the most and aren't needed): one roughness, flat
// faces. The file's base colour and metallic 0.38 kept; its teal specular tint left out (it needs
// the physical material, a heavier pipeline). No light through from behind (asked: SC-182).

import * as THREE from 'three/webgpu';
import { dot, float, normalView, positionViewDirection, pow, saturate, uniform } from 'three/tsl';

type Rgb = [number, number, number];

export interface IceLook {
  /** The file's base colour (linear), metallic and one roughness (its noise ramp's middle). */
  colour: Rgb;
  metalness: number;
  roughness: number;
  /** How far past the lit side each light reaches (0: none, 1: all round), the extra light's tint and strength. */
  wrap: number;
  wrapTint: Rgb;
  wrapStrength: number;
  /** Blue at glancing angles: its colour, how tight to the edge (power), strength. */
  rim: Rgb;
  rimPower: number;
  rimStrength: number;
}

export const ICE_DEFAULTS: IceLook = {
  colour: [0.5878, 0.7411, 1],
  metalness: 0.3843,
  roughness: 0.73,
  wrap: 0.5,
  wrapTint: [0.2, 0.55, 1],
  wrapStrength: 1.6,
  rim: [0.3, 0.7, 1],
  rimPower: 3,
  rimStrength: 0.2,
};

const COLOUR_KEYS = ['colour', 'wrapTint', 'rim'] as const;
type ColourKey = (typeof COLOUR_KEYS)[number];
type NumberKey = Exclude<keyof IceLook, ColourKey>;
export type IceUniforms = { [K in ColourKey]: THREE.UniformNode<'color', THREE.Color> } & { [K in NumberKey]: THREE.UniformNode<'float', number> };

/** The physical model, plus each light's wrapped share, tinted. */
class IceLightingModel extends THREE.PhysicalLightingModel {
  constructor(private readonly u: IceUniforms) {
    super();
  }

  override direct(input: Parameters<THREE.PhysicalLightingModel['direct']>[0], builder: Parameters<THREE.PhysicalLightingModel['direct']>[1]): void {
    super.direct(input, builder);
    const { lightDirection, lightColor, reflectedLight } = input as unknown as {
      lightDirection: THREE.Node<'vec3'>;
      lightColor: THREE.Node<'vec3'>;
      reflectedLight: { directDiffuse: THREE.Node<'vec3'> };
    };
    const u = this.u;
    const nl = dot(normalView, lightDirection);
    const wrapped = saturate(nl.add(u.wrap).div(u.wrap.add(1)));
    // Only the share past what the plain model already gave (Lambert's 1/π, as three's diffuse).
    const extra = wrapped.sub(saturate(nl)).max(0);
    reflectedLight.directDiffuse.addAssign(lightColor.mul(u.wrapTint).mul(extra).mul(u.wrapStrength).mul(1 / Math.PI));
  }
}

class IceMaterial extends THREE.MeshStandardNodeMaterial {
  constructor(private readonly u: IceUniforms) {
    super();
  }

  override setupLightingModel(): THREE.PhysicalLightingModel {
    return new IceLightingModel(this.u);
  }
}

export interface Ice {
  material: THREE.MeshStandardNodeMaterial;
  u: IceUniforms;
  set(look: Partial<IceLook>): void;
}

/** The ice's material. `lightsNode`: in the game, the outside's own lights (decision log, 2026-10-23). */
export function createIce(options: { lightsNode?: THREE.LightsNode; look?: Partial<IceLook> } = {}): Ice {
  const u = {} as Record<string, THREE.UniformNode<'color', THREE.Color> | THREE.UniformNode<'float', number>>;
  for (const [key, value] of Object.entries(ICE_DEFAULTS)) {
    u[key] = Array.isArray(value) ? uniform(new THREE.Color().setRGB(value[0], value[1], value[2])) : uniform(value as number);
  }
  const U = u as unknown as IceUniforms;
  const material = new IceMaterial(U);
  material.name = 'Ice';
  material.colorNode = U.colour;
  material.metalnessNode = U.metalness;
  material.roughnessNode = U.roughness;
  const facing = saturate(dot(normalView, positionViewDirection));
  material.emissiveNode = U.rim.mul(pow(float(1).sub(facing), U.rimPower)).mul(U.rimStrength);
  if (options.lightsNode) material.lightsNode = options.lightsNode;

  const set = (look: Partial<IceLook>) => {
    for (const [key, value] of Object.entries(look)) {
      const node = u[key];
      if (!node || value === undefined) continue;
      if (Array.isArray(value)) (node.value as THREE.Color).setRGB(value[0], value[1], value[2]);
      else (node as THREE.UniformNode<'float', number>).value = value as number;
    }
  };
  if (options.look) set(options.look);
  return { material, u: U, set };
}
