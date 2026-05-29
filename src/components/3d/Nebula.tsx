import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SCENE_CONFIG } from "../../constants/scene";

const { NEBULA } = SCENE_CONFIG;

/**
 * Procedural nebula backdrop. A large inverted sphere enclosing the whole
 * scene, painted with fbm value-noise in the fragment shader so the flat
 * deep-space background gains soft colored clouds behind the Stars. No texture
 * asset — every knob lives in SCENE_CONFIG.NEBULA. Drawn first with depth test
 * off so room geometry and stars always render in front of it.
 */
const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vDir;

  uniform float uTime;
  uniform float uScale;
  uniform float uIntensity;
  uniform vec3 uBase;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

  // 3D value noise + fbm (cheap, no texture lookups).
  vec3 hash3(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
            dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
        mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
            dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
      mix(
        mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
            dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
        mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
            dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y),
      u.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 d = vDir * uScale;
    float t = uTime;

    // Two noise fields drive density; a third tints. Remap to 0..1.
    float n1 = fbm(d + vec3(t, 0.0, 0.0)) * 0.5 + 0.5;
    float n2 = fbm(d * 2.3 + vec3(-t * 0.7, 5.0, 2.0)) * 0.5 + 0.5;
    float n3 = fbm(d * 4.1 + vec3(t * 0.4, 11.0, -7.0)) * 0.5 + 0.5;

    // Cloud density — biased so there are clear gaps of empty space.
    float density = pow(clamp(n1 * 0.6 + n2 * 0.4, 0.0, 1.0), 1.4);

    // Colour ramp through the cloud body, with a magenta highlight in the
    // densest pockets.
    vec3 cloud = mix(uColorB, uColorA, smoothstep(0.45, 0.90, n1));
    cloud = mix(cloud, uColorC, smoothstep(0.80, 0.99, n3) * 0.5);

    vec3 col = mix(uBase, cloud, clamp(density * uIntensity * 1.8, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function Nebula() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScale: { value: NEBULA.SCALE },
      uIntensity: { value: NEBULA.INTENSITY },
      uBase: { value: new THREE.Color(NEBULA.BASE_COLOR) },
      uColorA: { value: new THREE.Color(NEBULA.COLOR_A) },
      uColorB: { value: new THREE.Color(NEBULA.COLOR_B) },
      uColorC: { value: new THREE.Color(NEBULA.COLOR_C) },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta * NEBULA.SPEED;
    }
  });

  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[NEBULA.RADIUS, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}
