"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Component, type ReactNode, useEffect, useMemo, useState } from "react";
import * as THREE from "three";

import type {
  AssessmentInputPayload,
  AssessmentResult,
  StructureOption,
  TankOption,
} from "@/lib/types";

const COLORS = {
  ground: "#cfe2d8",
  wall: "#efe8d8",
  roof: "#cfc4ad",
  parapet: "#ded4c0",
  tank: "#2f7f6b",
  water: "#7fc4d8",
  soil: "#8d7b5e",
  sand: "#dcc48d",
  gravel: "#a9a49a",
  boulder: "#7f7a70",
  pipe: "#5f7d74",
  grate: "#4f5b56",
  filter: "#8a9a94",
};

const labelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.96)",
  border: "1px solid #dfe9e3",
  borderRadius: 9,
  padding: "5px 9px",
  fontSize: 11.5,
  lineHeight: 1.35,
  color: "#10231f",
  whiteSpace: "nowrap",
  boxShadow: "0 3px 12px rgba(16,35,31,0.12)",
  pointerEvents: "none",
  display: "flex",
  alignItems: "flex-start",
  gap: 7,
};

const labelDot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 2,
  marginTop: 3,
  flex: "0 0 auto",
};

function Label({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div style={labelStyle}>
      <span style={{ ...labelDot, background: color }} />
      <span>
        {title}
        <br />
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function Pipe({
  start,
  end,
  radius = 0.07,
}: {
  start: [number, number, number];
  end: [number, number, number];
  radius?: number;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const direction = to.clone().sub(from);
    const midpoint = from.clone().add(to).multiplyScalar(0.5);
    const orientation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    return {
      position: midpoint.toArray() as [number, number, number],
      quaternion: orientation,
      length: direction.length(),
    };
  }, [start, end]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshStandardMaterial color={COLORS.pipe} roughness={0.55} metalness={0.15} />
    </mesh>
  );
}

/**
 * A ground plane with a rectangular opening at the recharge pit, so the
 * underground structure is visible without hiding the whole scene.
 */
function Ground({
  size,
  hole,
}: {
  size: number;
  hole: { x: number; z: number; width: number; depth: number } | null;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-size / 2, -size / 2);
    shape.lineTo(size / 2, -size / 2);
    shape.lineTo(size / 2, size / 2);
    shape.lineTo(-size / 2, size / 2);
    shape.closePath();

    if (hole) {
      const path = new THREE.Path();
      const x0 = hole.x - hole.width / 2;
      const x1 = hole.x + hole.width / 2;
      const y0 = -hole.z - hole.depth / 2;
      const y1 = -hole.z + hole.depth / 2;
      path.moveTo(x0, y0);
      path.lineTo(x1, y0);
      path.lineTo(x1, y1);
      path.lineTo(x0, y1);
      path.closePath();
      shape.holes.push(path);
    }

    return new THREE.ShapeGeometry(shape);
  }, [size, hole]);

  const outline = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  return (
    <group>
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color={COLORS.ground} roughness={1} />
      </mesh>
      <lineSegments geometry={outline} rotation={[-Math.PI / 2, 0, 0]}>
        <lineBasicMaterial color="#a9c2b6" />
      </lineSegments>
    </group>
  );
}

function House({ side, height }: { side: number; height: number }) {
  const parapet = 0.34;
  const thickness = 0.16;

  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[side, height, side]} />
        <meshStandardMaterial color={COLORS.wall} roughness={0.9} />
      </mesh>

      <mesh position={[0, height + 0.03, 0]} receiveShadow>
        <boxGeometry args={[side, 0.1, side]} />
        <meshStandardMaterial color={COLORS.roof} roughness={0.95} />
      </mesh>

      {[
        { position: [0, height + parapet / 2, side / 2] as [number, number, number], size: [side, parapet, thickness] as [number, number, number] },
        { position: [0, height + parapet / 2, -side / 2] as [number, number, number], size: [side, parapet, thickness] as [number, number, number] },
        { position: [side / 2, height + parapet / 2, 0] as [number, number, number], size: [thickness, parapet, side] as [number, number, number] },
        { position: [-side / 2, height + parapet / 2, 0] as [number, number, number], size: [thickness, parapet, side] as [number, number, number] },
      ].map((piece, index) => (
        <mesh key={index} position={piece.position} castShadow>
          <boxGeometry args={piece.size} />
          <meshStandardMaterial color={COLORS.parapet} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Tank({ tank, left, showLabel }: { tank: TankOption; left: number; showLabel: boolean }) {
  const dimensions = tank.dimensions;
  const isRectangular = tank.shape === "rectangular";

  const length = isRectangular ? dimensions.length_m : dimensions.diameter_m;
  const width = isRectangular ? dimensions.width_m : dimensions.diameter_m;
  const height = dimensions.height_m;
  const centerX = left + length / 2;

  return (
    <group position={[centerX, 0, 0]}>
      {isRectangular ? (
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[length, height, width]} />
          <meshStandardMaterial color={COLORS.tank} roughness={0.55} transparent opacity={0.92} />
        </mesh>
      ) : (
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[width / 2, width / 2, height, 32]} />
          <meshStandardMaterial color={COLORS.tank} roughness={0.55} transparent opacity={0.92} />
        </mesh>
      )}

      {isRectangular ? (
        <mesh position={[0, height * 0.45, 0]}>
          <boxGeometry args={[length - 0.14, height * 0.72, width - 0.14]} />
          <meshStandardMaterial color={COLORS.water} transparent opacity={0.4} />
        </mesh>
      ) : (
        <mesh position={[0, height * 0.45, 0]}>
          <cylinderGeometry args={[width / 2 - 0.08, width / 2 - 0.08, height * 0.72, 32]} />
          <meshStandardMaterial color={COLORS.water} transparent opacity={0.4} />
        </mesh>
      )}

      {isRectangular ? (
        <mesh position={[0, height * 0.72, width / 2 + 0.015]}>
          <boxGeometry args={[length - 0.2, 0.05, 0.03]} />
          <meshStandardMaterial color={COLORS.water} />
        </mesh>
      ) : (
        <mesh position={[0, height * 0.72, 0]}>
          <cylinderGeometry args={[width / 2 + 0.015, width / 2 + 0.015, 0.05, 32, 1, true]} />
          <meshStandardMaterial color={COLORS.water} side={THREE.DoubleSide} />
        </mesh>
      )}

      <mesh position={[0, height + 0.04, 0]}>
        <boxGeometry args={[length + 0.08, 0.08, width + 0.08]} />
        <meshStandardMaterial color="#246353" roughness={0.7} />
      </mesh>

      {showLabel ? (
        <Html position={[0, height + 1.8, 0]} center>
          <Label
            title="Storage tank"
            value={`${tank.usable_m3.toFixed(1)} m³ usable`}
            color={COLORS.tank}
          />
        </Html>
      ) : null}
    </group>
  );
}

function RechargeStructure({ structure, left, showLabel }: { structure: StructureOption; left: number; showLabel: boolean }) {
  const dimensions = structure.dimensions;
  const isCircular = structure.shape === "circular";

  if (isCircular) {
    const radius = dimensions.diameter_m / 2;
    const depth = dimensions.depth_m;
    const centerX = left + radius;

    return (
      <group position={[centerX, 0, 0]}>
        <mesh position={[0, -depth / 2, 0]}>
          <cylinderGeometry args={[radius, radius, depth, 32]} />
          <meshStandardMaterial color={COLORS.soil} transparent opacity={0.22} />
        </mesh>
        <mesh position={[0, -depth + 0.15, 0]}>
          <cylinderGeometry args={[radius - 0.05, radius - 0.05, 0.3, 32]} />
          <meshStandardMaterial color={COLORS.boulder} roughness={1} />
        </mesh>
        <mesh position={[0, -depth * 0.55, 0]}>
          <cylinderGeometry args={[radius - 0.05, radius - 0.05, depth * 0.45, 32]} />
          <meshStandardMaterial color={COLORS.gravel} roughness={1} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[radius + 0.1, radius + 0.1, 0.1, 32]} />
          <meshStandardMaterial color={COLORS.grate} />
        </mesh>
        {showLabel ? (
          <Html position={[0, 0.95, 0]} center>
            <Label
              title="Recharge shaft"
              value={`Ø ${dimensions.diameter_m.toFixed(1)} m × ${depth.toFixed(1)} m`}
              color={COLORS.soil}
            />
          </Html>
        ) : null}
      </group>
    );
  }

  const length = dimensions.length_m;
  const width = dimensions.width_m;
  const depth = dimensions.depth_m;
  const centerX = left + length / 2;

  const sand = depth * 0.18;
  const gravel = depth * 0.3;
  const boulders = depth - sand - gravel;

  const slats = [-0.36, -0.12, 0.12, 0.36];

  return (
    <group position={[centerX, 0, 0]}>
      {/* Excavation volume */}
      <mesh position={[0, -depth / 2, 0]}>
        <boxGeometry args={[length, depth, width]} />
        <meshStandardMaterial color={COLORS.soil} transparent opacity={0.18} />
      </mesh>

      {/* Filter media, top to bottom */}
      <mesh position={[0, -sand / 2, 0]}>
        <boxGeometry args={[length - 0.06, sand, width - 0.06]} />
        <meshStandardMaterial color={COLORS.sand} roughness={1} />
      </mesh>
      <mesh position={[0, -(sand + gravel / 2), 0]}>
        <boxGeometry args={[length - 0.06, gravel, width - 0.06]} />
        <meshStandardMaterial color={COLORS.gravel} roughness={1} />
      </mesh>
      <mesh position={[0, -(sand + gravel + boulders / 2), 0]}>
        <boxGeometry args={[length - 0.06, boulders, width - 0.06]} />
        <meshStandardMaterial color={COLORS.boulder} roughness={1} />
      </mesh>

      {/* Corner posts make the excavation read clearly */}
      {[
        [-length / 2, -width / 2],
        [length / 2, -width / 2],
        [length / 2, width / 2],
        [-length / 2, width / 2],
      ].map(([x, z], index) => (
        <mesh key={index} position={[x, -depth / 2, z]}>
          <boxGeometry args={[0.05, depth, 0.05]} />
          <meshStandardMaterial color={COLORS.soil} />
        </mesh>
      ))}

      {/* Grate frame and slats, leaving the media visible between them */}
      {[
        { position: [0, 0.05, width / 2 + 0.05] as [number, number, number], size: [length + 0.2, 0.08, 0.1] as [number, number, number] },
        { position: [0, 0.05, -width / 2 - 0.05] as [number, number, number], size: [length + 0.2, 0.08, 0.1] as [number, number, number] },
        { position: [length / 2 + 0.05, 0.05, 0] as [number, number, number], size: [0.1, 0.08, width + 0.2] as [number, number, number] },
        { position: [-length / 2 - 0.05, 0.05, 0] as [number, number, number], size: [0.1, 0.08, width + 0.2] as [number, number, number] },
      ].map((bar, index) => (
        <mesh key={index} position={bar.position}>
          <boxGeometry args={bar.size} />
          <meshStandardMaterial color={COLORS.grate} />
        </mesh>
      ))}
      {slats.map((offset) => (
        <mesh key={offset} position={[offset * length, 0.1, 0]}>
          <boxGeometry args={[0.05, 0.05, width + 0.2]} />
          <meshStandardMaterial color="#8a9a94" />
        </mesh>
      ))}

      {showLabel ? (
        <Html position={[0, 2.4, 0]} center>
          <Label
            title={`Recharge ${structure.type}`}
            value={`${length.toFixed(1)} × ${width.toFixed(1)} × ${depth.toFixed(1)} m`}
            color={COLORS.soil}
          />
        </Html>
      ) : null}
    </group>
  );
}

function CameraRig({ centerX, width }: { centerX: number; width: number }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(centerX + width * 0.28, width * 0.88, width * 1.35);
    camera.lookAt(centerX + 0.8, 1.4, 0);
    camera.updateProjectionMatrix();
  }, [camera, centerX, width]);

  return null;
}

function Scene({ result, input }: { result: AssessmentResult; input: AssessmentInputPayload }) {
  const [labelsReady, setLabelsReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLabelsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const area = result.rooftop.area_m2 || 100;
  const houseSide = Math.min(16, Math.max(5, Math.sqrt(area)));
  const houseHeight = Math.max(2.6, input.geometry.building_height_m ?? 6);

  const tank = result.storage.recommended;
  const structure = result.structure;

  const tankFootprint = tank
    ? tank.shape === "rectangular"
      ? {
          length: tank.dimensions.length_m,
          width: tank.dimensions.width_m,
          height: tank.dimensions.height_m,
        }
      : {
          length: tank.dimensions.diameter_m,
          width: tank.dimensions.diameter_m,
          height: tank.dimensions.height_m,
        }
    : null;

  const structureFootprint = structure
    ? structure.shape === "circular"
      ? {
          length: structure.dimensions.diameter_m,
          width: structure.dimensions.diameter_m,
          depth: structure.dimensions.depth_m,
        }
      : {
          length: structure.dimensions.length_m,
          width: structure.dimensions.width_m,
          depth: structure.dimensions.depth_m,
        }
    : null;

  const gap = 3.5;
  const tankLeft = houseSide / 2 + gap;
  const structureLeft = tankFootprint ? tankLeft + tankFootprint.length + gap : houseSide / 2 + gap;

  const rightEdge = structureFootprint
    ? structureLeft + structureFootprint.length
    : tankFootprint
      ? tankLeft + tankFootprint.length
      : houseSide / 2;

  const leftEdge = -houseSide / 2;
  const centerX = (leftEdge + rightEdge) / 2;
  const span = Math.max(rightEdge - leftEdge + 8, houseSide + 8, 14);

  const tankCenterX = tankFootprint ? tankLeft + tankFootprint.length / 2 : null;
  const structureCenterX = structureFootprint
    ? structureLeft + structureFootprint.length / 2
    : null;
  const headerY = tankFootprint ? tankFootprint.height + 0.25 : 0.4;
  const downpipeX = houseSide / 2 - 0.35;

  const groundHole = structureFootprint
    ? {
        x: structureCenterX ?? 0,
        z: structureFootprint.width / 2 + 0.25,
        width: structureFootprint.length + 1.5,
        depth: structureFootprint.width + 4.0,
      }
    : null;

  return (
    <>
      <color attach="background" args={["#cfe2d8"]} />
      <fog attach="fog" args={["#cfe2d8", 55, 170]} />
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[centerX + span, span * 1.5, span * 0.9]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={1}
        shadow-camera-far={span * 4}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[centerX - span, span * 0.5, -span]} intensity={0.35} />

      <CameraRig centerX={centerX} width={rightEdge - leftEdge} />

      <Ground size={span * 10} hole={groundHole} />

      {groundHole && structureFootprint ? (
        <group position={[groundHole.x, 0, groundHole.z]}>
          <mesh position={[0, -structureFootprint.depth - 0.05, 0]} receiveShadow>
            <boxGeometry args={[groundHole.width, 0.1, groundHole.depth]} />
            <meshStandardMaterial color={COLORS.soil} roughness={1} />
          </mesh>
          <mesh position={[0, -structureFootprint.depth / 2, -groundHole.depth / 2 + 0.05]}>
            <boxGeometry args={[groundHole.width, structureFootprint.depth, 0.1]} />
            <meshStandardMaterial color={COLORS.soil} roughness={1} />
          </mesh>
          <mesh position={[-groundHole.width / 2 + 0.05, -structureFootprint.depth / 2, 0]}>
            <boxGeometry args={[0.1, structureFootprint.depth, groundHole.depth]} />
            <meshStandardMaterial color={COLORS.soil} roughness={1} />
          </mesh>
          <mesh position={[groundHole.width / 2 - 0.05, -structureFootprint.depth / 2, 0]}>
            <boxGeometry args={[0.1, structureFootprint.depth, groundHole.depth]} />
            <meshStandardMaterial color={COLORS.soil} roughness={1} />
          </mesh>
        </group>
      ) : null}

      <House side={houseSide} height={houseHeight} />

      {tank && tankFootprint ? <Tank tank={tank} left={tankLeft} showLabel={labelsReady} /> : null}
      {structure && structureFootprint ? (
        <RechargeStructure structure={structure} left={structureLeft} showLabel={labelsReady} />
      ) : null}

      {/* Downpipe from the roof edge */}
      <Pipe
        start={[downpipeX, houseHeight + 0.35, 0]}
        end={[downpipeX, headerY, 0]}
      />

      {tankCenterX !== null ? (
        <>
          <Pipe start={[downpipeX, headerY, 0]} end={[tankCenterX, headerY, 0]} />
          <mesh position={[tankLeft - 0.55, headerY, 0]}>
            <boxGeometry args={[0.75, 0.5, 0.75]} />
            <meshStandardMaterial color={COLORS.filter} roughness={0.7} />
          </mesh>
        </>
      ) : null}

      {structureCenterX !== null ? (
        tankFootprint && tankCenterX !== null ? (
          <>
            <Pipe
              start={[tankCenterX, headerY, 0]}
              end={[tankLeft + tankFootprint.length + 0.4, headerY, 0]}
            />
            <Pipe
              start={[tankLeft + tankFootprint.length + 0.4, headerY, 0]}
              end={[tankLeft + tankFootprint.length + 0.4, 0.35, 0]}
            />
            <Pipe
              start={[tankLeft + tankFootprint.length + 0.4, 0.35, 0]}
              end={[structureCenterX, 0.35, 0]}
            />
          </>
        ) : (
          <>
            <Pipe start={[downpipeX, 0.4, 0]} end={[downpipeX, 0.35, 0]} />
            <Pipe start={[downpipeX, 0.35, 0]} end={[structureCenterX, 0.35, 0]} />
          </>
        )
      ) : null}

      <OrbitControls
        makeDefault
        enablePan
        minDistance={span * 0.45}
        maxDistance={span * 2.6}
        maxPolarAngle={Math.PI / 2.02}
        autoRotate
        autoRotateSpeed={0.4}
        target={[centerX + 0.8, 1.4, 0]}
      />
    </>
  );
}

class ViewerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="viewer center" style={{ display: "grid", placeItems: "center" }}>
          <p className="muted small">
            3D preview is unavailable in this browser. The dimensions in the
            specification table are authoritative.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function StructureViewer({
  result,
  input,
}: {
  result: AssessmentResult;
  input: AssessmentInputPayload;
}) {
  return (
    <ViewerBoundary>
      <div className="viewer">
        <Canvas shadows dpr={[1, 2]} camera={{ fov: 40 }}>
          <Scene result={result} input={input} />
        </Canvas>
        <div className="viewer-note">Drag to orbit · scroll to zoom · illustrative, not to scale</div>
        <div className="viewer-legend">
          <div className="legend-row">
            <span className="legend-dot" style={{ background: COLORS.wall }} />
            Roof {Math.round(result.rooftop.area_m2)} m²
          </div>
          <div className="legend-row">
            <span className="legend-dot" style={{ background: COLORS.tank }} />
            Storage
          </div>
          <div className="legend-row">
            <span className="legend-dot" style={{ background: COLORS.water }} />
            Water level
          </div>
          <div className="legend-row">
            <span className="legend-dot" style={{ background: COLORS.sand }} />
            Filter media
          </div>
          <div className="legend-row">
            <span className="legend-dot" style={{ background: COLORS.pipe }} />
            Pipework
          </div>
        </div>
      </div>
    </ViewerBoundary>
  );
}
