'use client'

import * as THREE from 'three'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { useRef, useMemo } from 'react'

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  varying vec2 vUv;

  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);
    float waveTime = uTime * 2.0;
    float waveWidth = 0.2;
    float wave = smoothstep(waveTime - waveWidth, waveTime, dist) - smoothstep(waveTime, waveTime + waveWidth, dist);
    float strength = max(0.0, 1.0 - (waveTime / 1.5)) * 0.05;
    vec2 displacedUv = vUv + normalize(vUv - center) * wave * strength;
    vec4 color = texture2D(uTexture, displacedUv);
    color.rgb += noise(vUv * 1000.0) * 0.02;
    gl_FragColor = color;
  }
`;

const ShaderPlane = ({ imageUrl }: { imageUrl: string }) => {
  const meshRef = useRef<THREE.ShaderMaterial>(null!);
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  const uniforms = useMemo(() => ({
    uTime: { value: 0.0 },
    uTexture: { value: texture },
  }), [texture]);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
        meshRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh>
      <planeGeometry args={[10, 10, 32, 32]} />
      <shaderMaterial
        ref={meshRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export const LiquidEffect = () => {
  // publicフォルダに置いた画像を指定します
  const imageUrl = "/splash-background.jpg"; 
  
  return (
    <Canvas camera={{ fov: 45, position: [0, 0, 5] }}>
      <ShaderPlane imageUrl={imageUrl} />
    </Canvas>
  );
};