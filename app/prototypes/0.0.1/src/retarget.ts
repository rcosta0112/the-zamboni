// Retargeting: play animations made for one skeleton on another with the same bone names but
// different bone orientations (rolls) and proportions.
//
// For every frame of a source clip, each bone's rotation away from its rest pose is measured in
// world space and applied to the target bone of the same name, on top of the target's own rest
// pose. The root (Body) also carries its movement, scaled by the ratio of the two hip heights.
// The result is a normal AnimationClip for the target, so playback costs nothing extra.

import * as THREE from 'three/webgpu';

const ROOT = 'Body';

function bonesByName(root: THREE.Object3D): Map<string, THREE.Bone> {
  const map = new Map<string, THREE.Bone>();
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone && !map.has(o.name)) map.set(o.name, o as THREE.Bone);
  });
  return map;
}

export function retargetClips(
  source: THREE.Object3D,
  target: THREE.Object3D,
  clips: THREE.AnimationClip[],
  options: { fps?: number; yawFixDeg?: number; skip?: (name: string) => boolean } = {},
): THREE.AnimationClip[] {
  const fps = options.fps ?? 30;
  const skip = options.skip ?? ((name: string) => name.endsWith('.IK') || name.endsWith('_end'));
  const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(options.yawFixDeg ?? 0));
  const yawInv = yaw.clone().invert();

  const sBones = bonesByName(source);
  const tBones = bonesByName(target);

  // Target bones to drive, parents before children (traversal order).
  const names: string[] = [];
  target.traverse((o) => {
    if ((o as THREE.Bone).isBone && sBones.has(o.name) && !skip(o.name)) names.push(o.name);
  });

  // Remember the source's rest pose, to restore after sampling.
  const sRestLocal = new Map<string, { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }>();
  for (const [name, b] of sBones) sRestLocal.set(name, { p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone() });

  source.updateMatrixWorld(true);
  target.updateMatrixWorld(true);

  const sRestW = new Map<string, THREE.Quaternion>();
  const tRestW = new Map<string, THREE.Quaternion>();
  const tParentRestW = new Map<string, THREE.Quaternion>();
  for (const name of names) {
    sRestW.set(name, sBones.get(name)!.getWorldQuaternion(new THREE.Quaternion()));
    const tb = tBones.get(name)!;
    tRestW.set(name, tb.getWorldQuaternion(new THREE.Quaternion()));
    tParentRestW.set(name, tb.parent!.getWorldQuaternion(new THREE.Quaternion()));
  }

  const sRoot = sBones.get(ROOT);
  const tRoot = tBones.get(ROOT);
  const sRootRest = sRoot?.getWorldPosition(new THREE.Vector3());
  const tRootRest = tRoot?.getWorldPosition(new THREE.Vector3());
  const heightRatio = sRootRest && tRootRest && sRootRest.y > 0 ? tRootRest.y / sRootRest.y : 1;
  const tRootParentInv = tRoot ? tRoot.parent!.matrixWorld.clone().invert() : null;

  const mixer = new THREE.AnimationMixer(source);
  const out: THREE.AnimationClip[] = [];
  const q = new THREE.Quaternion();
  const tmp = new THREE.Quaternion();
  const pos = new THREE.Vector3();

  for (const clip of clips) {
    const frames = Math.max(2, Math.ceil(clip.duration * fps) + 1);
    const times = new Float32Array(frames);
    const rot = new Map(names.map((n) => [n, new Float32Array(frames * 4)]));
    const rootPos = new Float32Array(frames * 3);

    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.play();

    for (let f = 0; f < frames; f++) {
      const t = Math.min(clip.duration, f / fps);
      times[f] = t;
      mixer.setTime(t);
      source.updateMatrixWorld(true);

      const world = new Map<string, THREE.Quaternion>();
      for (const name of names) {
        // Rotation away from rest, in world space: D = current · rest⁻¹ (turned by the yaw fix).
        sBones.get(name)!.getWorldQuaternion(q);
        q.multiply(tmp.copy(sRestW.get(name)!).invert());
        q.premultiply(yaw).multiply(yawInv);
        // Same rotation applied to the target's rest: world = D · targetRest.
        const w = q.clone().multiply(tRestW.get(name)!);
        world.set(name, w);
        // Local = parentWorld⁻¹ · world (the parent's world comes from this frame if it's driven).
        const parent = tBones.get(name)!.parent!;
        const parentW = world.get(parent.name) ?? tParentRestW.get(name)!;
        tmp.copy(parentW).invert().multiply(w);
        tmp.toArray(rot.get(name)!, f * 4);
      }

      if (sRoot && sRootRest && tRootRest && tRootParentInv) {
        sRoot.getWorldPosition(pos).sub(sRootRest).applyQuaternion(yaw).multiplyScalar(heightRatio).add(tRootRest);
        pos.applyMatrix4(tRootParentInv);
        pos.toArray(rootPos, f * 3);
      }
    }

    action.stop();
    const tracks: THREE.KeyframeTrack[] = names.map(
      (n) => new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, times, rot.get(n)!),
    );
    if (tRoot) tracks.push(new THREE.VectorKeyframeTrack(`${ROOT}.position`, times, rootPos));
    out.push(new THREE.AnimationClip(clip.name, clip.duration, tracks));
  }

  mixer.stopAllAction();
  mixer.uncacheRoot(source);
  for (const [name, b] of sBones) {
    const r = sRestLocal.get(name)!;
    b.position.copy(r.p);
    b.quaternion.copy(r.q);
    b.scale.copy(r.s);
  }
  source.updateMatrixWorld(true);
  return out;
}
