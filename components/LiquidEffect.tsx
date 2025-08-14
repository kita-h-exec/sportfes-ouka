'use client'

'use client'

import * as THREE from 'three'
import { Canvas, useFrame, extend } from '@react-three/fiber'
import { useRef, useEffect, useState, Suspense } from 'react'
import { shaderMaterial } from '@react-three/drei'
import { type MotionValue } from 'framer-motion'

// The final shader, perfecting the balance of fluidity and a high-quality glass look.
const LiquidGlassFinalMaterial = shaderMaterial(
  // Uniforms
  {
    uTime: 0,
    uTexture: new THREE.Texture(),
    uProgress: 0.0,      // Animation progress (0: sphere, 1: plane)
    uRefraction: 0.95,   // Increased refraction for sharper distortion
    uDispersion: 0.05,   // A more subtle, refined prism effect
    uShininess: 80.0,      // A sharp, glassy highlight
    uFresnelPower: 3.0,  // Emphasizes the reflective edges
    uNoiseStrength: 0.005, // A very subtle wobble for a liquid feel
  },
  // Vertex Shader
  `
    varying vec3 v_worldPosition;
    varying vec2 vUv;
    varying vec3 v_normal;
    void main() {
      vUv = uv;
      v_normal = normal;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      v_worldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  // Fragment Shader
  `
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform float uProgress;
    uniform float uRefraction;
    uniform float uDispersion;
    uniform float uShininess;
    uniform float uFresnelPower;
    uniform float uNoiseStrength;
    varying vec2 vUv;
    varying vec3 v_worldPosition;
    varying vec3 v_normal;

    float smootherstep(float edge0, float edge1, float x) {
      x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
    }

    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5);
      float dist = distance(uv, center);

      vec3 sphereNormal = normalize(vec3(uv - center, sqrt(max(0.0, 0.25 - dist * dist))));
      vec3 planeNormal = v_normal;
      vec3 normal = normalize(mix(sphereNormal, planeNormal, uProgress));

      vec3 viewDir = normalize(cameraPosition - v_worldPosition);
      vec3 lightDir = normalize(vec3(0.8, 0.8, 2.5));
      
      float fresnel = pow(1.0 - dot(viewDir, normal), uFresnelPower);
      fresnel = smootherstep(0.0, 1.0, fresnel) * (1.0 - uProgress);

      vec3 halfDir = normalize(lightDir + viewDir);
      float specular = pow(max(0.0, dot(normal, halfDir)), uShininess);
      specular *= (1.0 - uProgress);
      vec3 specularColor = vec3(1.0) * specular;

      float liquidWobble = noise(uv * 10.0 + uTime * 0.2) * uNoiseStrength * (1.0 - uProgress);

      vec2 refractedUvR = uv - (refract(viewDir, normal, uRefraction - uDispersion)).xy * (1.0 - uProgress) * 0.15;
      vec2 refractedUvG = uv - (refract(viewDir, normal, uRefraction)).xy * (1.0 - uProgress) * 0.15;
      vec2 refractedUvB = uv - (refract(viewDir, normal, uRefraction + uDispersion)).xy * (1.0 - uProgress) * 0.15;

      vec3 refractedColor = vec3(
        texture2D(uTexture, refractedUvR + liquidWobble).r,
        texture2D(uTexture, refractedUvG + liquidWobble).g,
        texture2D(uTexture, refractedUvB + liquidWobble).b
      );

      vec3 finalColor = refractedColor + specularColor + (fresnel * 0.4);

      float radius = 0.5 * (1.0 - uProgress);
      float mask = 1.0 - smootherstep(radius - 0.01, radius, dist);
      float alpha = mix(mask, 1.0, uProgress);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
);

extend({ LiquidGlassFinalMaterial });

const ShaderPlane = ({ texture, progress }: { texture: THREE.Texture, progress: MotionValue<number> }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      materialRef.current.uniforms.uProgress.value = progress.get();
    }
  });

  return (
    <mesh>
      <planeGeometry args={[10, 10, 128, 128]} />
      {/* @ts-expect-error - Custom shader material type not recognized by TypeScript */}
      <liquidGlassFinalMaterial ref={materialRef} uTexture={texture} transparent={true} />
    </mesh>
  );
}

const Scene = ({ imageUrl, progress, onReady }: { imageUrl: string, progress: MotionValue<number>, onReady: () => void }) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (loadedTexture) => {
        setTexture(loadedTexture);
        onReady();
      },
      undefined, // onProgress callback (optional)
      (error) => {
        console.error('An error happened during texture loading:', error);
        // Fallback: Create a plain white texture
        const fallbackTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
        fallbackTexture.needsUpdate = true;
        setTexture(fallbackTexture);
        onReady(); // Still call onReady to proceed with the animation
      }
    );
  }, [imageUrl, onReady]);

  if (!texture) {
    return null; // Or a placeholder loader
  }

  return <ShaderPlane texture={texture} progress={progress} />;
}

export const LiquidEffect = ({ progress, onReady }: { progress: MotionValue<number>, onReady: () => void }) => {
  const imageUrl = "/splash-background.jpg"; 
  
  return (
    <Canvas camera={{ fov: 50, position: [0, 0, 6] }}>
      <Suspense fallback={null}>
        <Scene imageUrl={imageUrl} progress={progress} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
};
