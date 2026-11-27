import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AppThemeId } from '../types/game';
import { getThemeConfig } from '../utils/themes';

interface ThreeDMapBackgroundProps {
  themeId?: AppThemeId;
  reduceMotion?: boolean;
}

export const ThreeDMapBackground: React.FC<ThreeDMapBackgroundProps> = ({
  themeId = 'botanical',
  reduceMotion = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const theme = getThemeConfig(themeId);

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(theme.accentHex, 3.5, 50);
    pointLight.position.set(10, 15, 12);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0xffffff, 2.0, 50);
    pointLight2.position.set(-12, -10, 10);
    scene.add(pointLight2);

    // Create 3D Floating Crystal Geometries & Liquid Orbs
    const group = new THREE.Group();
    scene.add(group);

    const geometries = [
      new THREE.IcosahedronGeometry(1.6, 0),
      new THREE.OctahedronGeometry(1.8, 0),
      new THREE.TorusKnotGeometry(1.1, 0.35, 64, 16),
      new THREE.DodecahedronGeometry(1.5, 0),
      new THREE.SphereGeometry(1.3, 32, 32),
    ];

    const meshCount = 14;
    const meshes: { mesh: THREE.Mesh; rotSpeed: THREE.Vector3; floatSpeed: number; baseY: number }[] = [];

    for (let i = 0; i < meshCount; i++) {
      const geom = geometries[i % geometries.length];
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(theme.accentHex).offsetHSL(i * 0.05, 0.2, i % 2 === 0 ? 0.1 : -0.1),
        roughness: 0.15,
        metalness: 0.25,
        transmission: 0.65,
        thickness: 1.2,
        ior: 1.5,
        transparent: true,
        opacity: 0.85,
        wireframe: i % 3 === 0,
      });

      const mesh = new THREE.Mesh(geom, material);
      const x = (Math.random() - 0.5) * 24;
      const y = (Math.random() - 0.5) * 22;
      const z = (Math.random() - 0.5) * 10 - 2;
      mesh.position.set(x, y, z);

      const scale = 0.6 + Math.random() * 0.9;
      mesh.scale.set(scale, scale, scale);

      group.add(mesh);
      meshes.push({
        mesh,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.015,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.01
        ),
        floatSpeed: 0.5 + Math.random() * 1.5,
        baseY: y,
      });
    }

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (!reduceMotion) {
        meshes.forEach((item, idx) => {
          item.mesh.rotation.x += item.rotSpeed.x;
          item.mesh.rotation.y += item.rotSpeed.y;
          item.mesh.rotation.z += item.rotSpeed.z;
          item.mesh.position.y = item.baseY + Math.sin(elapsedTime * item.floatSpeed + idx) * 0.8;
        });
        group.rotation.y = elapsedTime * 0.03;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container) {
        container.innerHTML = '';
      }
      renderer.dispose();
    };
  }, [themeId, reduceMotion]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none"
    />
  );
};
