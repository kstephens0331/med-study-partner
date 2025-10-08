"use client";

import { Canvas } from "@react-three/fiber";
import { Float, Stage } from "@react-three/drei";
import { useMemo } from "react";

type Props = { accent?: string; speaking?: boolean };

export default function Hologram({ accent = "#10b981", speaking = false }: Props) {
  // Simple, abstract hologram orb + rings (swap with GLTF later)
  const color = useMemo(() => accent, [accent]);

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900">
      <Canvas dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <Stage environment={null} intensity={0.4} adjustCamera={false}>
          <Float floatIntensity={speaking ? 2 : 1} speed={speaking ? 2 : 1}>
            <mesh>
              <icosahedronGeometry args={[1.1, 0]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={speaking ? 1.2 : 0.6} roughness={0.2} metalness={0.2} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.6, 0.02, 16, 120]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
            </mesh>
            <mesh rotation={[0, Math.PI / 3, 0]}>
              <torusGeometry args={[1.9, 0.02, 16, 120]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
            </mesh>
          </Float>
        </Stage>
      </Canvas>

      {/* scanline + glow overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,255,255,0.03)_51%)] bg-[length:100%_6px] mix-blend-screen" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_60%)]" style={{ '--tw-gradient-from': color } as any} />
    </div>
  );
}
