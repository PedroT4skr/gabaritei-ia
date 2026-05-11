import { OpenCV, ObjectType, ColorConversionCodes } from 'react-native-fast-opencv';
import { Gabarito } from '../types/gabarito';
import { OmrCorrectionResult, OmrPoint, OmrQuestionResult } from '../types/omr';
import Constants from 'expo-constants';

type Blob = {
  x: number;
  y: number;
  w: number;
  h: number;
  mass: number;
  ar: number;
  solidity: number;
  cornerDensity: number;
  centerDensity: number;
  edgeDensity: number;
  outerDensity: number;
  minRowFill: number;
  minColFill: number;
  fillUniformity: number;
  rx?: number;
  ry?: number;
  origX?: number;
  origY?: number;
};

type AnchorPair = {
  left: Blob;
  right: Blob;
  ry: number;
};

type PillarStats = {
  count: number;
  minY: number;
  maxY: number;
  sumX: number;
  widths: number[];
};

type CandidateStage = 'strict' | 'relaxed' | 'fallback';

type GeometryValidation = {
  valid: boolean;
  score: number;
  reason?: string;
};

export type AnchorDetectionCorner = {
  x: number;
  y: number;
};

export type AnchorDetectionResult = {
  found: boolean;
  corners: AnchorDetectionCorner[];
  anchors: AnchorDetectionCorner[];
  pairsCount: number;
  imageWidth: number;
  imageHeight: number;
  confidence: number;
  reason?: string;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / Math.max(1, arr.length);

function getMedian(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function altRatios(numAlts: number) {
  const base = 47.5;
  const stride = 21;
  const span = 151;
  const ratios: number[] = [];
  for (let i = 0; i < numAlts; i++) ratios.push((base + i * stride) / span);
  return ratios;
}

function getMarkerIndices(numQ: number) {
  const ni = Math.max(1, Math.round((numQ - 1) / 5));
  const step = (numQ - 1) / ni;
  return Array.from({ length: ni + 1 }, (_, k) => Math.round(k * step));
}

function findBlobsFast(binData: Uint8Array, w: number, h: number) {
  const vis = new Uint8Array(w * h);
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  const blobs: Blob[] = [];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const seed = y * w + x;
      if (vis[seed] || binData[seed] === 0) continue;

      let head = 0;
      let tail = 0;
      qx[tail] = x;
      qy[tail] = y;
      tail++;
      vis[seed] = 1;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let mass = 0;

      while (head < tail) {
        const cx = qx[head];
        const cy = qy[head];
        head++;
        mass++;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let ny = cy - 1; ny <= cy + 1; ny++) {
          for (let nx = cx - 1; nx <= cx + 1; nx++) {
            if (nx === cx && ny === cy) continue;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;

            const ni = ny * w + nx;
            if (!vis[ni] && binData[ni] > 0) {
              vis[ni] = 1;
              qx[tail] = nx;
              qy[tail] = ny;
              tail++;
            }
          }
        }
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      if (bw < 6 || bh < 6 || bw > w * 0.1 || bh > h * 0.1) continue;

      const area = bw * bh;
      if (mass < 20 || area === 0) continue;

      const solidity = mass / area;

      const cornerPatchW = Math.max(1, Math.round(bw * 0.22));
      const cornerPatchH = Math.max(1, Math.round(bh * 0.22));
      const corners = [
        { sx: minX, sy: minY },
        { sx: maxX - cornerPatchW + 1, sy: minY },
        { sx: minX, sy: maxY - cornerPatchH + 1 },
        { sx: maxX - cornerPatchW + 1, sy: maxY - cornerPatchH + 1 },
      ];
      let cornerFilled = 0;
      let cornerTot = 0;
      for (const corner of corners) {
        for (let py = corner.sy; py < corner.sy + cornerPatchH; py++) {
          for (let px = corner.sx; px < corner.sx + cornerPatchW; px++) {
            if (px < 0 || px >= w || py < 0 || py >= h) continue;
            if (binData[py * w + px] > 0) cornerFilled++;
            cornerTot++;
          }
        }
      }
      const cornerDensity = cornerTot > 0 ? cornerFilled / cornerTot : 0;

      const innerMinX = Math.round(minX + bw * 0.27);
      const innerMaxX = Math.round(maxX - bw * 0.27);
      const innerMinY = Math.round(minY + bh * 0.27);
      const innerMaxY = Math.round(maxY - bh * 0.27);

      let centerFilled = 0;
      let centerTot = 0;
      let edgeFilled = 0;
      let edgeTot = 0;

      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const isOn = binData[py * w + px] > 0;
          const inCenter = px >= innerMinX && px <= innerMaxX && py >= innerMinY && py <= innerMaxY;
          if (inCenter) {
            centerTot++;
            if (isOn) centerFilled++;
          } else {
            edgeTot++;
            if (isOn) edgeFilled++;
          }
        }
      }

      const centerDensity = centerTot > 0 ? centerFilled / centerTot : 0;
      const edgeDensity = edgeTot > 0 ? edgeFilled / edgeTot : 0;

      const padX = Math.max(2, Math.round(bw * 0.35));
      const padY = Math.max(2, Math.round(bh * 0.35));
      const exMinX = Math.max(0, minX - padX);
      const exMaxX = Math.min(w - 1, maxX + padX);
      const exMinY = Math.max(0, minY - padY);
      const exMaxY = Math.min(h - 1, maxY + padY);

      let outerFilled = 0;
      let outerTot = 0;
      for (let py = exMinY; py <= exMaxY; py++) {
        for (let px = exMinX; px <= exMaxX; px++) {
          const insideBlob = px >= minX && px <= maxX && py >= minY && py <= maxY;
          if (insideBlob) continue;
          if (binData[py * w + px] > 0) outerFilled++;
          outerTot++;
        }
      }
      const outerDensity = outerTot > 0 ? outerFilled / outerTot : 0;

      const rowFillRatios: number[] = [];
      for (let py = minY; py <= maxY; py++) {
        let rowOn = 0;
        for (let px = minX; px <= maxX; px++) {
          if (binData[py * w + px] > 0) rowOn++;
        }
        rowFillRatios.push(rowOn / Math.max(1, bw));
      }

      const colFillRatios: number[] = [];
      for (let px = minX; px <= maxX; px++) {
        let colOn = 0;
        for (let py = minY; py <= maxY; py++) {
          if (binData[py * w + px] > 0) colOn++;
        }
        colFillRatios.push(colOn / Math.max(1, bh));
      }

      const minRowFill = rowFillRatios.length > 0 ? Math.min(...rowFillRatios) : 0;
      const minColFill = colFillRatios.length > 0 ? Math.min(...colFillRatios) : 0;
      const fillUniformity = clamp01(1 - Math.abs(minRowFill - minColFill));

      blobs.push({
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        w: bw,
        h: bh,
        mass,
        ar: bw / bh,
        solidity,
        cornerDensity,
        centerDensity,
        edgeDensity,
        outerDensity,
        minRowFill,
        minColFill,
        fillUniformity,
      });
    }
  }

  return blobs;
}

function sampleDensityFast(binData: Uint8Array, w: number, h: number, cx: number, cy: number, r: number) {
  let filled = 0;
  let tot = 0;
  const ri = Math.max(1, Math.round(r));
  for (let dy = -ri; dy <= ri; dy++) {
    for (let dx = -ri; dx <= ri; dx++) {
      if (dx * dx + dy * dy > ri * ri) continue;
      const px = Math.round(cx + dx);
      const py = Math.round(cy + dy);
      if (px >= 0 && px < w && py >= 0 && py < h) {
        if (binData[py * w + px] > 0) filled++;
        tot++;
      }
    }
  }
  return tot > 0 ? filled / tot : 0;
}

function sampleDarkness(grayData: Uint8Array, w: number, h: number, cx: number, cy: number, innerR: number, outerR: number) {
  let sum = 0;
  let tot = 0;
  const out = Math.max(1, Math.round(outerR));
  const inSq = innerR * innerR;
  const outSq = outerR * outerR;

  for (let dy = -out; dy <= out; dy++) {
    for (let dx = -out; dx <= out; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > outSq || d2 < inSq) continue;
      const px = Math.round(cx + dx);
      const py = Math.round(cy + dy);
      if (px >= 0 && px < w && py >= 0 && py < h) {
        const g = grayData[py * w + px];
        sum += (255 - g) / 255;
        tot++;
      }
    }
  }

  return tot > 0 ? sum / tot : 0;
}

function pairAnchorsByY(
  leftAnchors: Blob[],
  rightAnchors: Blob[],
  toleranceY: number,
  minDx = 0,
  maxDx = Number.POSITIVE_INFINITY,
): AnchorPair[] {
  const usedRight = new Set<number>();
  const pairs: AnchorPair[] = [];
  const leftSorted = [...leftAnchors].sort((a, b) => (a.ry ?? a.y) - (b.ry ?? b.y));
  const rightSorted = [...rightAnchors].sort((a, b) => (a.ry ?? a.y) - (b.ry ?? b.y));

  for (const left of leftSorted) {
    const leftY = left.ry ?? left.y;
    let bestIdx = -1;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < rightSorted.length; i++) {
      if (usedRight.has(i)) continue;
      const right = rightSorted[i];
      const rightY = right.ry ?? right.y;
      const dy = Math.abs(rightY - leftY);
      const leftX = left.rx ?? left.x;
      const rightX = right.rx ?? right.x;
      const dx = rightX - leftX;
      if (dx < minDx || dx > maxDx) continue;
      if (dy < bestDist) {
        bestDist = dy;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestDist <= toleranceY) {
      const right = rightSorted[bestIdx];
      usedRight.add(bestIdx);
      pairs.push({
        left,
        right,
        ry: ((left.ry ?? left.y) + (right.ry ?? right.y)) / 2,
      });
    }
  }

  return pairs.sort((a, b) => a.ry - b.ry);
}

function filterSymmetricAnchorCandidates(candidates: Blob[], w: number, h: number) {
  const left = candidates.filter(c => c.x < w / 2);
  const right = candidates.filter(c => c.x >= w / 2);
  if (left.length === 0 || right.length === 0) return candidates;

  const keep = new Set<Blob>();
  const yTol = Math.max(12, h * 0.055);

  for (const l of left) {
    let best: Blob | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const r of right) {
      const dy = Math.abs(r.y - l.y);
      if (dy > yTol) continue;
      const sizeRatio = l.w / Math.max(1, r.w);
      if (sizeRatio < 0.52 || sizeRatio > 1.95) continue;
      const dx = Math.abs(r.x - l.x);
      if (dx < w * 0.15) continue;
      if (dy < bestDist) {
        best = r;
        bestDist = dy;
      }
    }
    if (best) {
      keep.add(l);
      keep.add(best);
    }
  }

  const paired = Array.from(keep);
  return paired.length >= 4 ? paired : candidates;
}

function compactPairsToMarkerRows(pairs: AnchorPair[], markerCount: number) {
  if (pairs.length <= markerCount) return pairs;
  const sorted = [...pairs].sort((a, b) => a.ry - b.ry);
  const compacted: AnchorPair[] = [];

  for (let i = 0; i < markerCount; i++) {
    const start = Math.floor((i * sorted.length) / markerCount);
    const end = Math.max(start + 1, Math.floor(((i + 1) * sorted.length) / markerCount));
    const chunk = sorted.slice(start, end);
    if (chunk.length === 0) continue;

    const targetY = chunk.reduce((s, p) => s + p.ry, 0) / chunk.length;
    let best = chunk[0];
    let bestDist = Math.abs(chunk[0].ry - targetY);
    for (let k = 1; k < chunk.length; k++) {
      const d = Math.abs(chunk[k].ry - targetY);
      if (d < bestDist) {
        best = chunk[k];
        bestDist = d;
      }
    }
    compacted.push(best);
  }

  return compacted.sort((a, b) => a.ry - b.ry);
}

function selectBestMarkerPairs(pairs: AnchorPair[], markerCount: number, w: number, h: number) {
  if (pairs.length <= markerCount) {
    return snapPairsToSideLines(compactPairsToMarkerRows(pairs, markerCount));
  }

  const sorted = [...pairs].sort((a, b) => a.ry - b.ry);
  let best: AnchorPair[] | null = null;
  let bestScore = -1;

  for (let start = 0; start <= sorted.length - markerCount; start++) {
    const window = sorted.slice(start, start + markerCount);
    const snapped = snapPairsToSideLines(window);
    const geom = validateAnchorGeometry(snapped, w, h);

    const span = snapped[snapped.length - 1].ry - snapped[0].ry;
    const spanScore = clamp01(span / Math.max(1, h * 0.2));

    const gaps: number[] = [];
    for (let i = 1; i < snapped.length; i++) gaps.push(snapped[i].ry - snapped[i - 1].ry);
    const meanGap = mean(gaps);
    const gapVar = gaps.reduce((s, g) => s + Math.abs(g - meanGap), 0) / Math.max(1, gaps.length);
    const uniformScore = clamp01(1 - gapVar / Math.max(1, h * 0.05));

    const score = (geom.valid ? 1 : 0.4) * (geom.score * 0.62 + spanScore * 0.23 + uniformScore * 0.15);
    if (score > bestScore) {
      best = snapped;
      bestScore = score;
    }
  }

  return best ?? snapPairsToSideLines(compactPairsToMarkerRows(sorted, markerCount));
}

function snapPairsToSideLines(pairs: AnchorPair[]) {
  if (pairs.length < 2) return pairs;
  const sorted = [...pairs].sort((a, b) => a.ry - b.ry);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const yRange = Math.max(1, bottom.ry - top.ry);

  const topLX = top.left.origX ?? top.left.x;
  const topLY = top.left.origY ?? top.left.y;
  const botLX = bottom.left.origX ?? bottom.left.x;
  const botLY = bottom.left.origY ?? bottom.left.y;

  const topRX = top.right.origX ?? top.right.x;
  const topRY = top.right.origY ?? top.right.y;
  const botRX = bottom.right.origX ?? bottom.right.x;
  const botRY = bottom.right.origY ?? bottom.right.y;

  return sorted.map((p) => {
    const t = clamp01((p.ry - top.ry) / yRange);
    const idealLX = topLX + (botLX - topLX) * t;
    const idealLY = topLY + (botLY - topLY) * t;
    const idealRX = topRX + (botRX - topRX) * t;
    const idealRY = topRY + (botRY - topRY) * t;

    const currentLx = p.left.origX ?? p.left.x;
    const currentLy = p.left.origY ?? p.left.y;
    const currentRx = p.right.origX ?? p.right.x;
    const currentRy = p.right.origY ?? p.right.y;

    const alpha = 0.72;
    const snappedLx = currentLx * (1 - alpha) + idealLX * alpha;
    const snappedLy = currentLy * (1 - alpha) + idealLY * alpha;
    const snappedRx = currentRx * (1 - alpha) + idealRX * alpha;
    const snappedRy = currentRy * (1 - alpha) + idealRY * alpha;

    const left: Blob = { ...p.left, x: snappedLx, y: snappedLy, origX: snappedLx, origY: snappedLy };
    const right: Blob = { ...p.right, x: snappedRx, y: snappedRy, origX: snappedRx, origY: snappedRy };
    return { left, right, ry: (snappedLy + snappedRy) / 2 };
  });
}

function filterAnchorsByRailDistance(anchors: Blob[], pairs: AnchorPair[], w: number, h: number) {
  if (anchors.length < 4 || pairs.length < 2) return anchors;

  const sorted = [...pairs].sort((a, b) => a.ry - b.ry);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const tl = { x: top.left.origX ?? top.left.x, y: top.left.origY ?? top.left.y };
  const bl = { x: bottom.left.origX ?? bottom.left.x, y: bottom.left.origY ?? bottom.left.y };
  const tr = { x: top.right.origX ?? top.right.x, y: top.right.origY ?? top.right.y };
  const br = { x: bottom.right.origX ?? bottom.right.x, y: bottom.right.origY ?? bottom.right.y };

  const yMin = Math.min(tl.y, tr.y) - h * 0.05;
  const yMax = Math.max(bl.y, br.y) + h * 0.05;

  const medianW = getMedian(anchors.map(a => a.w));
  const tol = Math.max(w * 0.03, medianW * 2.2);

  const lerpXAtY = (a: { x: number; y: number }, b: { x: number; y: number }, y: number) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) < 1e-6) return (a.x + b.x) / 2;
    const t = (y - a.y) / dy;
    return a.x + (b.x - a.x) * t;
  };

  const filtered = anchors.filter((a) => {
    const ay = a.origY ?? a.y;
    const ax = a.origX ?? a.x;
    if (ay < yMin || ay > yMax) return false;

    const lx = lerpXAtY(tl, bl, ay);
    const rx = lerpXAtY(tr, br, ay);

    const dLeft = Math.abs(ax - lx);
    const dRight = Math.abs(ax - rx);
    return dLeft <= tol || dRight <= tol;
  });

  return filtered.length >= 4 ? filtered : anchors;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function convexQuadArea(corners: AnchorDetectionCorner[]) {
  let area2 = 0;
  for (let i = 0; i < corners.length; i++) {
    const j = (i + 1) % corners.length;
    area2 += corners[i].x * corners[j].y - corners[j].x * corners[i].y;
  }
  return Math.abs(area2) * 0.5;
}

function validateAnchorGeometry(pairs: AnchorPair[], w: number, h: number): GeometryValidation {
  if (pairs.length < 2) return { valid: false, score: 0, reason: 'few_pairs' };

  const sorted = [...pairs].sort((a, b) => a.ry - b.ry);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const tl = { x: top.left.origX ?? top.left.x, y: top.left.origY ?? top.left.y };
  const tr = { x: top.right.origX ?? top.right.x, y: top.right.origY ?? top.right.y };
  const br = { x: bottom.right.origX ?? bottom.right.x, y: bottom.right.origY ?? bottom.right.y };
  const bl = { x: bottom.left.origX ?? bottom.left.x, y: bottom.left.origY ?? bottom.left.y };

  const corners = [tl, tr, br, bl];
  const area = convexQuadArea(corners);
  const areaNorm = area / Math.max(1, w * h);
  if (areaNorm < 0.04) return { valid: false, score: 0.1, reason: 'small_area' };

  const topW = distance(tl, tr);
  const bottomW = distance(bl, br);
  const leftH = distance(tl, bl);
  const rightH = distance(tr, br);

  if (topW < w * 0.10 || bottomW < w * 0.10) {
    return { valid: false, score: 0.1, reason: 'small_width' };
  }
  if (leftH < h * 0.10 || rightH < h * 0.10) {
    return { valid: false, score: 0.1, reason: 'small_height' };
  }

  const widthRatio = topW / Math.max(1, bottomW);
  const heightRatio = leftH / Math.max(1, rightH);
  const diagA = distance(tl, br);
  const diagB = distance(tr, bl);
  const diagRatio = diagA / Math.max(1, diagB);
  const topAngle = Math.atan2(tr.y - tl.y, tr.x - tl.x);
  const bottomAngle = Math.atan2(br.y - bl.y, br.x - bl.x);
  const leftAngle = Math.atan2(bl.y - tl.y, bl.x - tl.x);
  const rightAngle = Math.atan2(br.y - tr.y, br.x - tr.x);
  const angleDeltaTopBottom = Math.abs(Math.atan2(Math.sin(topAngle - bottomAngle), Math.cos(topAngle - bottomAngle)));
  const angleDeltaLeftRight = Math.abs(Math.atan2(Math.sin(leftAngle - rightAngle), Math.cos(leftAngle - rightAngle)));

  const widthRatioScore = clamp01(1 - Math.min(1, Math.abs(Math.log(widthRatio)) / 0.9));
  const heightRatioScore = clamp01(1 - Math.min(1, Math.abs(Math.log(heightRatio)) / 0.9));
  const diagRatioScore = clamp01(1 - Math.min(1, Math.abs(Math.log(diagRatio)) / 0.9));
  const parallelScore = clamp01(1 - (angleDeltaTopBottom + angleDeltaLeftRight) / 0.9);

  const yRange = Math.max(1, (bottom.ry - top.ry));
  let leftResidual = 0;
  let rightResidual = 0;
  let maxResidual = 0;
  const rowWidths: number[] = [];
  for (const p of sorted) {
    const t = clamp01((p.ry - top.ry) / yRange);
    const idealLX = tl.x + (bl.x - tl.x) * t;
    const idealLY = tl.y + (bl.y - tl.y) * t;
    const idealRX = tr.x + (br.x - tr.x) * t;
    const idealRY = tr.y + (br.y - tr.y) * t;

    const l = { x: p.left.origX ?? p.left.x, y: p.left.origY ?? p.left.y };
    const r = { x: p.right.origX ?? p.right.x, y: p.right.origY ?? p.right.y };

    const lRes = distance(l, { x: idealLX, y: idealLY });
    const rRes = distance(r, { x: idealRX, y: idealRY });
    leftResidual += lRes;
    rightResidual += rRes;
    if (lRes > maxResidual) maxResidual = lRes;
    if (rRes > maxResidual) maxResidual = rRes;

    rowWidths.push(distance(l, r));
  }

  const meanResidual = (leftResidual + rightResidual) / Math.max(1, sorted.length * 2);
  const residualScore = clamp01(1 - meanResidual / Math.max(8, w * 0.03));

  const score = clamp01(
    widthRatioScore * 0.17 +
    heightRatioScore * 0.17 +
    diagRatioScore * 0.16 +
    parallelScore * 0.18 +
    residualScore * 0.32
  );

  const plausibleRatios =
    widthRatio > 0.35 && widthRatio < 2.8 &&
    heightRatio > 0.35 && heightRatio < 2.8 &&
    diagRatio > 0.4 && diagRatio < 2.5;

  const midLeftX = (tl.x + bl.x) / 2;
  const midRightX = (tr.x + br.x) / 2;
  const horizontalGap = midRightX - midLeftX;
  const minGap = Math.max(w * 0.11, Math.min(topW, bottomW) * 0.33);
  if (horizontalGap < minGap) {
    return { valid: false, score: clamp01(score * 0.6), reason: 'crossed_sides' };
  }

  if (angleDeltaTopBottom > 0.72 || angleDeltaLeftRight > 0.72) {
    return { valid: false, score: clamp01(score * 0.65), reason: 'non_parallel_edges' };
  }

  const maxResidualAllowed = Math.max(10, w * 0.028);
  if (maxResidual > maxResidualAllowed) {
    return { valid: false, score: clamp01(score * 0.65), reason: 'outlier_anchor' };
  }

  const medianWidth = getMedian(rowWidths);
  const maxWidthDrift = rowWidths.length > 0
    ? Math.max(...rowWidths.map(v => Math.abs(v - medianWidth) / Math.max(1, medianWidth)))
    : 1;
  if (maxWidthDrift > 0.34) {
    return { valid: false, score: clamp01(score * 0.7), reason: 'inconsistent_width' };
  }

  if (!plausibleRatios || score < 0.45) {
    return { valid: false, score, reason: 'implausible_quad' };
  }

  return { valid: true, score };
}

function selectAnchorColumns(candidates: Blob[], w: number, h: number) {
  if (candidates.length < 4) return candidates;

  const binSize = Math.max(8, Math.round(w * 0.02));
  const leftMap = new Map<number, PillarStats>();
  const rightMap = new Map<number, PillarStats>();

  for (const c of candidates) {
    const key = Math.round(c.x / binSize) * binSize;
    const sideMap = c.x < w / 2 ? leftMap : rightMap;
    const prev = sideMap.get(key);
    if (!prev) {
      sideMap.set(key, {
        count: 1,
        minY: c.y,
        maxY: c.y,
        sumX: c.x,
        widths: [c.w],
      });
    } else {
      prev.count += 1;
      prev.minY = Math.min(prev.minY, c.y);
      prev.maxY = Math.max(prev.maxY, c.y);
      prev.sumX += c.x;
      prev.widths.push(c.w);
    }
  }

  const pickBestPillar = (map: Map<number, PillarStats>, isLeft: boolean) => {
    let bestX = -1;
    let bestScore = -1;
    let bestMedianWidth = 0;

    for (const [, stats] of map) {
      const avgX = stats.sumX / Math.max(1, stats.count);
      const spreadNorm = (stats.maxY - stats.minY) / Math.max(1, h);
      if (stats.count < 2 || spreadNorm < 0.18) continue;

      const edgeScore = isLeft
        ? clamp01((w * 0.45 - avgX) / (w * 0.45))
        : clamp01((avgX - w * 0.55) / (w * 0.45));
      const score = stats.count * 2.2 + spreadNorm * 8 + edgeScore * 2.4;
      if (score > bestScore) {
        bestScore = score;
        bestX = avgX;
        bestMedianWidth = getMedian(stats.widths);
      }
    }

    return { x: bestX, score: bestScore, medianWidth: bestMedianWidth };
  };

  const left = pickBestPillar(leftMap, true);
  const right = pickBestPillar(rightMap, false);

  if (left.x < 0 && right.x < 0) return candidates;

  const globalMedianWidth = getMedian(candidates.map(c => c.w));
  const tolFromWidth = Math.max(10, (left.medianWidth || globalMedianWidth || 8) * 2.8);
  const tol = Math.max(tolFromWidth, w * 0.045);

  return candidates.filter(c =>
    (left.x >= 0 && Math.abs(c.x - left.x) <= tol) ||
    (right.x >= 0 && Math.abs(c.x - right.x) <= tol)
  );
}

function blobAnchorPurityScore(b: Blob) {
  const shape = clamp01(1 - Math.abs(1 - b.ar));
  const solidity = clamp01((b.solidity - 0.7) / 0.28);
  const corners = clamp01((b.cornerDensity - 0.42) / 0.45);
  const center = clamp01((b.centerDensity - 0.58) / 0.38);
  const edge = clamp01((b.edgeDensity - 0.52) / 0.42);
  const outer = clamp01((0.20 - b.outerDensity) / 0.20);
  const row = clamp01((b.minRowFill - 0.50) / 0.45);
  const col = clamp01((b.minColFill - 0.50) / 0.45);
  return clamp01(
    shape * 0.12 +
    solidity * 0.14 +
    corners * 0.14 +
    center * 0.14 +
    edge * 0.14 +
    outer * 0.12 +
    row * 0.10 +
    col * 0.10
  );
}

function pickAnchorsNearExpected(
  candidates: Blob[],
  expectedCorners: AnchorDetectionCorner[],
  w: number,
  h: number,
) {
  if (expectedCorners.length !== 4 || candidates.length === 0) return null;
  const maxDist = Math.max(24, Math.min(w, h) * 0.18);
  const used = new Set<number>();
  const picked: Blob[] = [];

  for (const target of expectedCorners) {
    let bestIdx = -1;
    let bestScore = -1;
    for (let i = 0; i < candidates.length; i++) {
      if (used.has(i)) continue;
      const c = candidates[i];
      const dx = c.x - target.x;
      const dy = c.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDist) continue;

      const proximity = clamp01(1 - dist / maxDist);
      const purity = blobAnchorPurityScore(c);
      const score = purity * 0.62 + proximity * 0.38;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx < 0) return null;
    used.add(bestIdx);
    picked.push(candidates[bestIdx]);
  }

  if (picked.length !== 4) return null;
  return picked;
}

function normalizeExpectedCorners(
  expectedCorners: AnchorDetectionCorner[] | undefined,
  w: number,
  h: number,
) {
  if (!expectedCorners || expectedCorners.length !== 4) return [] as AnchorDetectionCorner[];
  return expectedCorners.map((c) => {
    const x = c.x <= 1.5 ? c.x * w : c.x;
    const y = c.y <= 1.5 ? c.y * h : c.y;
    return {
      x: Math.max(0, Math.min(w - 1, x)),
      y: Math.max(0, Math.min(h - 1, y)),
    };
  });
}

function orderCorners(corners: AnchorDetectionCorner[]) {
  if (corners.length !== 4) return null;
  const byY = [...corners].sort((a, b) => a.y - b.y);
  const top = byY.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = byY.slice(2, 4).sort((a, b) => a.x - b.x);
  if (top.length !== 2 || bottom.length !== 2) return null;
  return {
    tl: top[0],
    tr: top[1],
    br: bottom[1],
    bl: bottom[0],
  };
}

function pointToSegmentDistance(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  const t = c2 <= 0 ? 0 : Math.max(0, Math.min(1, c1 / c2));
  const projX = a.x + t * vx;
  const projY = a.y + t * vy;
  return distance(p, { x: projX, y: projY });
}

function collectRailAnchorsFromSeed(
  candidates: Blob[],
  seedCorners: Blob[],
  orderedSeed: { tl: AnchorDetectionCorner; tr: AnchorDetectionCorner; br: AnchorDetectionCorner; bl: AnchorDetectionCorner },
  w: number,
  h: number,
) {
  const medianW = getMedian(candidates.map((c) => c.w));
  const railTol = Math.max(12, Math.min(w, h) * 0.034, medianW * 2.25);
  const yMin = Math.min(orderedSeed.tl.y, orderedSeed.tr.y) - h * 0.08;
  const yMax = Math.max(orderedSeed.bl.y, orderedSeed.br.y) + h * 0.08;

  const nearRails = candidates.filter((c) => {
    if (c.y < yMin || c.y > yMax) return false;
    const p = { x: c.x, y: c.y };
    const dl = pointToSegmentDistance(p, orderedSeed.tl, orderedSeed.bl);
    const dr = pointToSegmentDistance(p, orderedSeed.tr, orderedSeed.br);
    return dl <= railTol || dr <= railTol;
  });

  const kept = [...nearRails];
  for (const seed of seedCorners) {
    if (!kept.some((k) => Math.abs(k.x - seed.x) <= 1 && Math.abs(k.y - seed.y) <= 1)) {
      kept.push(seed);
    }
  }
  return kept;
}

function mergeAnchorSets(a: Blob[], b: Blob[]) {
  const out: Blob[] = [];
  const seen = new Set<string>();
  for (const item of [...a, ...b]) {
    const key = `${Math.round(item.x / 3)}:${Math.round(item.y / 3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function selectAdaptiveAnchorCandidates(
  allBlobs: Blob[],
  w: number,
  h: number,
  minAllowedY: number,
) {
  const minRowW = Math.max(7, Math.round(w * 0.009));
  const maxRowW = Math.round(w * 0.07);

  const strict = allBlobs.filter(b =>
    b.w >= minRowW && b.w <= maxRowW && b.h >= minRowW && b.h <= maxRowW &&
    b.solidity > 0.82 && b.ar >= 0.82 && b.ar <= 1.22 &&
    b.cornerDensity > 0.54 &&
    b.centerDensity > 0.66 &&
    b.edgeDensity > 0.58 &&
    b.outerDensity < 0.13 &&
    b.minRowFill > 0.58 &&
    b.minColFill > 0.58 &&
    b.fillUniformity > 0.86 &&
    Math.abs(b.centerDensity - b.edgeDensity) < 0.20 &&
    b.y >= minAllowedY
  );
  if (strict.length >= 6) return { candidates: strict, stage: 'strict' as CandidateStage };

  const relaxed = allBlobs.filter(b =>
    b.w >= Math.max(6, minRowW - 2) && b.w <= Math.round(maxRowW * 1.14) &&
    b.h >= Math.max(6, minRowW - 2) && b.h <= Math.round(maxRowW * 1.14) &&
    b.solidity > 0.68 && b.ar >= 0.70 && b.ar <= 1.34 &&
    b.cornerDensity > 0.40 &&
    b.centerDensity > 0.52 &&
    b.edgeDensity > 0.46 &&
    b.outerDensity < 0.22 &&
    b.minRowFill > 0.42 &&
    b.minColFill > 0.42 &&
    b.fillUniformity > 0.72 &&
    Math.abs(b.centerDensity - b.edgeDensity) < 0.32 &&
    b.y >= Math.max(h * 0.14, minAllowedY - h * 0.05)
  );
  if (relaxed.length >= 4) return { candidates: relaxed, stage: 'relaxed' as CandidateStage };

  const fallback = allBlobs.filter(b =>
    b.w >= Math.max(6, minRowW - 3) && b.w <= Math.round(maxRowW * 1.2) &&
    b.h >= Math.max(6, minRowW - 3) && b.h <= Math.round(maxRowW * 1.2) &&
    b.solidity > 0.55 && b.ar >= 0.62 && b.ar <= 1.50 &&
    b.cornerDensity > 0.30 &&
    b.centerDensity > 0.42 &&
    b.edgeDensity > 0.36 &&
    b.outerDensity < 0.30 &&
    b.minRowFill > 0.32 &&
    b.minColFill > 0.32 &&
    b.fillUniformity > 0.60 &&
    b.y >= Math.max(h * 0.12, minAllowedY - h * 0.08)
  );
  return { candidates: fallback, stage: 'fallback' as CandidateStage };
}

function estimateLiveConfidence(stage: CandidateStage, candidateCount: number, anchorCount: number, pairsCount: number) {
  const stageBase = stage === 'strict' ? 0.24 : stage === 'relaxed' ? 0.19 : 0.13;
  const candidateScore = clamp01(candidateCount / 24);
  const anchorScore = clamp01(anchorCount / 10);
  const pairScore = clamp01(pairsCount / 6);
  return clamp01(stageBase + candidateScore * 0.32 + anchorScore * 0.28 + pairScore * 0.16);
}

function makeSyntheticBlobAt(x: number, y: number, size: number): Blob {
  const s = Math.max(6, size);
  return {
    x,
    y,
    w: s,
    h: s,
    mass: s * s * 0.78,
    ar: 1,
    solidity: 0.9,
    cornerDensity: 0.82,
    centerDensity: 0.82,
    edgeDensity: 0.8,
    outerDensity: 0.05,
    minRowFill: 0.78,
    minColFill: 0.78,
    fillUniformity: 0.88,
    rx: x,
    ry: y,
    origX: x,
    origY: y,
  };
}

function buildPairsFromCorners(
  corners: AnchorDetectionCorner[] | undefined,
  markerIndices: number[],
  totalRows: number,
  baseSize: number,
): AnchorPair[] {
  if (!corners || corners.length !== 4 || markerIndices.length < 2 || totalRows < 2) return [];
  const ordered = orderCorners(corners);
  if (!ordered) return [];
  const { tl, tr, br, bl } = ordered;

  return markerIndices.map((idx) => {
    const t = clamp01(idx / Math.max(1, totalRows - 1));
    const lx = tl.x + (bl.x - tl.x) * t;
    const ly = tl.y + (bl.y - tl.y) * t;
    const rx = tr.x + (br.x - tr.x) * t;
    const ry = tr.y + (br.y - tr.y) * t;

    const left = makeSyntheticBlobAt(lx, ly, baseSize);
    const right = makeSyntheticBlobAt(rx, ry, baseSize);
    return { left, right, ry: (ly + ry) / 2 };
  });
}

export class OpenCVEngine {
  static async detectAnchors(
    base64: string,
    questionCount?: number,
    expectedCorners?: AnchorDetectionCorner[],
  ): Promise<AnchorDetectionResult> {
    const cleanB64 = base64.includes('base64,') ? base64.split('base64,')[1] : base64;

    let srcMat;
    let grayMat;
    let binMat;

    try {
      srcMat = OpenCV.base64ToMat(cleanB64);
      if (!srcMat) throw new Error('OpenCV failed to decode image matrix.');

      const format = OpenCV.matToBuffer(srcMat, 'uint8');
      const w = format.cols;
      const h = format.rows;

      grayMat = OpenCV.createObject(ObjectType.Mat, h, w, 0);
      binMat = OpenCV.createObject(ObjectType.Mat, h, w, 0);

      OpenCV.invoke('cvtColor', srcMat, grayMat, ColorConversionCodes.COLOR_BGR2GRAY);

      let blockSize = Math.floor(w * 0.12);
      if (blockSize % 2 === 0) blockSize += 1;
      blockSize = Math.max(35, Math.min(151, blockSize));

      OpenCV.invoke('adaptiveThreshold', grayMat, binMat, 255, 1, 1, blockSize, 16);

      const binFormat = OpenCV.matToBuffer(binMat, 'uint8');
      const binData: Uint8Array = binFormat.buffer;
      OpenCV.clearBuffers();

      const allBlobs = findBlobsFast(binData, w, h);
      const expectedPx = normalizeExpectedCorners(expectedCorners, w, h);
      const minAllowedY = expectedPx.length === 4
        ? Math.max(h * 0.08, Math.min(...expectedPx.map((c) => c.y)) - h * 0.06)
        : h * 0.18;
      const adaptive = selectAdaptiveAnchorCandidates(allBlobs, w, h, minAllowedY);
      const candidates = adaptive.candidates;
      const symmetricCandidates = filterSymmetricAnchorCandidates(candidates, w, h);
      const seededAnchors = expectedPx.length === 4
        ? pickAnchorsNearExpected(symmetricCandidates, expectedPx, w, h)
        : null;
      const usedGuideSeed = !!(seededAnchors && seededAnchors.length === 4);
      const seedPurity = usedGuideSeed ? clamp01(mean((seededAnchors ?? []).map((s) => blobAnchorPurityScore(s)))) : 0;
      const columnAnchors = selectAnchorColumns(symmetricCandidates, w, h);

      let rowAnchors: Blob[] = [];
      if (seededAnchors && seededAnchors.length === 4) {
        const orderedSeed = orderCorners(seededAnchors.map((s) => ({ x: s.x, y: s.y })));
        const seededRail = orderedSeed
          ? collectRailAnchorsFromSeed(symmetricCandidates, seededAnchors, orderedSeed, w, h)
          : seededAnchors;
        rowAnchors = mergeAnchorSets(seededRail, columnAnchors);
      }
      if (rowAnchors.length < 4) rowAnchors = columnAnchors;
      if (rowAnchors.length < 4) rowAnchors = symmetricCandidates;
      if (rowAnchors.length < 4) {
        const progressConfidence = estimateLiveConfidence(adaptive.stage, candidates.length, rowAnchors.length, 0);
        return {
          found: false,
          corners: [],
          anchors: rowAnchors.map(a => ({ x: a.x, y: a.y })),
          pairsCount: 0,
          imageWidth: w,
          imageHeight: h,
          confidence: progressConfidence,
          reason: 'few_anchors',
        };
      }

      const minXBin = Math.min(...rowAnchors.map(a => a.x));
      const maxXBin = Math.max(...rowAnchors.map(a => a.x));
      const medX = (minXBin + maxXBin) / 2;

      const leftInitial = rowAnchors.filter(a => a.x < medX).sort((a, b) => a.y - b.y);
      const rightInitial = rowAnchors.filter(a => a.x >= medX).sort((a, b) => a.y - b.y);

      let topLeft: Blob | null = null;
      let topRight: Blob | null = null;
      if (leftInitial.length > 0 && rightInitial.length > 0) {
        for (const la of leftInitial) {
          let bestR: Blob | null = null;
          let bestDist = Number.POSITIVE_INFINITY;
          for (const ra of rightInitial) {
            const d = Math.abs(ra.y - la.y);
            if (d < bestDist) {
              bestDist = d;
              bestR = ra;
            }
          }
          if (bestR && bestDist < h * 0.15) {
            topLeft = la;
            topRight = bestR;
            break;
          }
        }
      }

      let normalizedAnchors = rowAnchors;
      if (topLeft && topRight) {
        const angle = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x);
        const ox = topLeft.x;
        const oy = topLeft.y;
        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);
        normalizedAnchors = rowAnchors.map(b => {
          const rx = (b.x - ox) * cosA - (b.y - oy) * sinA + ox;
          const ry = (b.x - ox) * sinA + (b.y - oy) * cosA + oy;
          return { ...b, rx, ry, origX: b.x, origY: b.y };
        });
      } else {
        normalizedAnchors = rowAnchors.map(b => ({ ...b, rx: b.x, ry: b.y, origX: b.x, origY: b.y }));
      }

      const rxValues = normalizedAnchors.map(a => a.rx ?? a.x);
      const medRx = (Math.min(...rxValues) + Math.max(...rxValues)) / 2;
      const leftA = normalizedAnchors.filter(a => (a.rx ?? a.x) < medRx).sort((a, b) => (a.ry ?? a.y) - (b.ry ?? b.y));
      const rightA = normalizedAnchors.filter(a => (a.rx ?? a.x) >= medRx).sort((a, b) => (a.ry ?? a.y) - (b.ry ?? b.y));
      const pairTol = h * (usedGuideSeed ? 0.085 : 0.07);
      const minPairDx = w * (usedGuideSeed ? 0.16 : 0.18);
      const maxPairDx = w * 0.96;
      let pairs = pairAnchorsByY(leftA, rightA, pairTol, minPairDx, maxPairDx);
      if (questionCount && questionCount > 1) {
        const markerRows = getMarkerIndices(questionCount).length;
        pairs = selectBestMarkerPairs(pairs, markerRows, w, h);
      }
      normalizedAnchors = filterAnchorsByRailDistance(normalizedAnchors, pairs, w, h);
      const leftAFinal = normalizedAnchors
        .filter(a => (a.rx ?? a.x) < medRx)
        .sort((a, b) => (a.ry ?? a.y) - (b.ry ?? b.y));
      const rightAFinal = normalizedAnchors
        .filter(a => (a.rx ?? a.x) >= medRx)
        .sort((a, b) => (a.ry ?? a.y) - (b.ry ?? b.y));
      pairs = pairAnchorsByY(leftAFinal, rightAFinal, pairTol, minPairDx, maxPairDx);
      if (questionCount && questionCount > 1) {
        const markerRows = getMarkerIndices(questionCount).length;
        pairs = selectBestMarkerPairs(pairs, markerRows, w, h);
      }
      pairs = snapPairsToSideLines(pairs);
      const geometry = validateAnchorGeometry(pairs, w, h);

      if (pairs.length < 2) {
        if (usedGuideSeed && seededAnchors && seededAnchors.length === 4) {
          const seedCorners: AnchorDetectionCorner[] = seededAnchors.map((s) => ({ x: s.x, y: s.y }));
          const seedAreaNorm = convexQuadArea(seedCorners) / Math.max(1, w * h);
          const seedGuideDistNorm = mean(seedCorners.map((c, i) =>
            distance(c, expectedPx[i]) / Math.max(1, Math.min(w, h) * 0.22),
          ));
          const seedGuideScore = clamp01(1 - seedGuideDistNorm);
          const seedConfidence = clamp01(0.5 + seedPurity * 0.24 + seedGuideScore * 0.22 + clamp01(candidates.length / 20) * 0.08);
          if (seedAreaNorm > 0.022 && seedGuideScore > 0.52 && seedPurity > 0.48) {
            return {
              found: true,
              corners: seedCorners,
              anchors: normalizedAnchors.map(a => ({ x: a.origX ?? a.x, y: a.origY ?? a.y })),
              pairsCount: pairs.length,
              imageWidth: w,
              imageHeight: h,
              confidence: Math.max(seedConfidence, 0.72),
              reason: 'seed_lock',
            };
          }
        }
        const progressConfidence = estimateLiveConfidence(adaptive.stage, candidates.length, normalizedAnchors.length, pairs.length);
        return {
          found: false,
          corners: [],
          anchors: normalizedAnchors.map(a => ({ x: a.origX ?? a.x, y: a.origY ?? a.y })),
          pairsCount: pairs.length,
          imageWidth: w,
          imageHeight: h,
          confidence: progressConfidence,
          reason: 'few_pairs',
        };
      }
      if (!geometry.valid) {
        if (usedGuideSeed && seededAnchors && seededAnchors.length === 4) {
          const seedCorners: AnchorDetectionCorner[] = seededAnchors.map((s) => ({ x: s.x, y: s.y }));
          const seedAreaNorm = convexQuadArea(seedCorners) / Math.max(1, w * h);
          const seedGuideDistNorm = mean(seedCorners.map((c, i) =>
            distance(c, expectedPx[i]) / Math.max(1, Math.min(w, h) * 0.22),
          ));
          const seedGuideScore = clamp01(1 - seedGuideDistNorm);
          const seedConfidence = clamp01(0.5 + seedPurity * 0.24 + seedGuideScore * 0.22 + clamp01(candidates.length / 20) * 0.08);
          if (seedAreaNorm > 0.022 && seedGuideScore > 0.52 && seedPurity > 0.48) {
            return {
              found: true,
              corners: seedCorners,
              anchors: normalizedAnchors.map(a => ({ x: a.origX ?? a.x, y: a.origY ?? a.y })),
              pairsCount: pairs.length,
              imageWidth: w,
              imageHeight: h,
              confidence: Math.max(seedConfidence, 0.72),
              reason: 'seed_lock',
            };
          }
        }
        return {
          found: false,
          corners: [],
          anchors: normalizedAnchors.map(a => ({ x: a.origX ?? a.x, y: a.origY ?? a.y })),
          pairsCount: pairs.length,
          imageWidth: w,
          imageHeight: h,
          confidence: geometry.score,
          reason: geometry.reason || 'invalid_geometry',
        };
      }

      const topPair = pairs[0];
      const bottomPair = pairs[pairs.length - 1];
      const corners: AnchorDetectionCorner[] = [
        { x: topPair.left.origX ?? topPair.left.x, y: topPair.left.origY ?? topPair.left.y },
        { x: topPair.right.origX ?? topPair.right.x, y: topPair.right.origY ?? topPair.right.y },
        { x: bottomPair.right.origX ?? bottomPair.right.x, y: bottomPair.right.origY ?? bottomPair.right.y },
        { x: bottomPair.left.origX ?? bottomPair.left.x, y: bottomPair.left.origY ?? bottomPair.left.y },
      ];

      const verticalSpan = Math.abs((bottomPair.ry ?? bottomPair.left.y) - (topPair.ry ?? topPair.left.y));
      const spanScore = clamp01(verticalSpan / (h * 0.35));
      const pairScore = clamp01(pairs.length / 6);
      const pairPurities = pairs.map((p) => {
        const leftPurity = (p.left.minRowFill + p.left.minColFill + (1 - p.left.outerDensity)) / 3;
        const rightPurity = (p.right.minRowFill + p.right.minColFill + (1 - p.right.outerDensity)) / 3;
        return (leftPurity + rightPurity) / 2;
      });
      const purityScore = clamp01(mean(pairPurities));
      const baseConfidence = clamp01(pairScore * 0.32 + spanScore * 0.18 + geometry.score * 0.28 + purityScore * 0.22);
      const guideDistNorm = expectedPx.length === 4
        ? mean(corners.map((c, i) => distance(c, expectedPx[i]) / Math.max(1, Math.min(w, h) * 0.16)))
        : 0;
      const guideScore = expectedPx.length === 4 ? clamp01(1 - guideDistNorm) : 0;
      const seedBoost = usedGuideSeed ? 0.08 : 0;
      const pairBoost = clamp01((pairs.length - 2) / 4) * 0.06;
      const confidence = expectedPx.length === 4
        ? clamp01(baseConfidence * 0.9 + guideScore * 0.1)
        : clamp01(baseConfidence + pairBoost * 0.5);
      const boostedConfidence = clamp01(confidence + seedBoost + pairBoost);

      if (expectedPx.length === 4 && usedGuideSeed && guideScore < 0.12 && baseConfidence < 0.56) {
        return {
          found: false,
          corners: [],
          anchors: normalizedAnchors.map(a => ({ x: a.origX ?? a.x, y: a.origY ?? a.y })),
          pairsCount: pairs.length,
          imageWidth: w,
          imageHeight: h,
          confidence: boostedConfidence,
          reason: 'off_guide',
        };
      }

      if (purityScore < 0.64) {
        return {
          found: false,
          corners: [],
          anchors: normalizedAnchors.map(a => ({ x: a.origX ?? a.x, y: a.origY ?? a.y })),
          pairsCount: pairs.length,
          imageWidth: w,
          imageHeight: h,
          confidence: boostedConfidence,
          reason: 'low_anchor_purity',
        };
      }

      return {
        found: true,
        corners,
        anchors: normalizedAnchors.map(a => ({ x: a.origX ?? a.x, y: a.origY ?? a.y })),
        pairsCount: pairs.length,
        imageWidth: w,
        imageHeight: h,
        confidence: boostedConfidence,
      };
    } catch (error) {
      OpenCV.clearBuffers();
      return {
        found: false,
        corners: [],
        anchors: [],
        pairsCount: 0,
        imageWidth: 0,
        imageHeight: 0,
        confidence: 0,
        reason: 'exception',
      };
    }
  }

  static async processBase64(
    base64: string,
    gabarito: Gabarito,
    lockedCorners?: AnchorDetectionCorner[],
  ): Promise<OmrCorrectionResult> {
    console.log('[OpenCVEngine] Starting native vision pipeline...');

    const cleanB64 = base64.includes('base64,') ? base64.split('base64,')[1] : base64;

    let srcMat;
    let grayMat;
    let binMat;

    try {
      srcMat = OpenCV.base64ToMat(cleanB64);
      if (!srcMat) throw new Error('OpenCV failed to decode image matrix.');

      const format = OpenCV.matToBuffer(srcMat, 'uint8');
      const w = format.cols;
      const h = format.rows;
      console.log(`[OpenCVEngine] Loaded image matrix: ${w}x${h}`);

      grayMat = OpenCV.createObject(ObjectType.Mat, h, w, 0);
      binMat = OpenCV.createObject(ObjectType.Mat, h, w, 0);

      OpenCV.invoke('cvtColor', srcMat, grayMat, ColorConversionCodes.COLOR_BGR2GRAY);

      let blockSize = Math.floor(w * 0.12);
      if (blockSize % 2 === 0) blockSize += 1;
      blockSize = Math.max(35, Math.min(151, blockSize));

      OpenCV.invoke('adaptiveThreshold', grayMat, binMat, 255, 1, 1, blockSize, 16);

      const binFormat = OpenCV.matToBuffer(binMat, 'uint8');
      const binData: Uint8Array = binFormat.buffer;
      const grayFormat = OpenCV.matToBuffer(grayMat, 'uint8');
      const grayData: Uint8Array = grayFormat.buffer;

      OpenCV.clearBuffers();

      let allBlobs = findBlobsFast(binData, w, h);
      const expectedPx = normalizeExpectedCorners(lockedCorners, w, h);
      const minAllowedY = expectedPx.length === 4
        ? Math.max(h * 0.08, Math.min(...expectedPx.map((c) => c.y)) - h * 0.06)
        : h * 0.18;
      const adaptive = selectAdaptiveAnchorCandidates(allBlobs, w, h, minAllowedY);
      const candidates = adaptive.candidates;
      const symmetricCandidates = filterSymmetricAnchorCandidates(candidates, w, h);
      const seededAnchors = expectedPx.length === 4
        ? pickAnchorsNearExpected(symmetricCandidates, expectedPx, w, h)
        : null;
      const columnAnchors = selectAnchorColumns(symmetricCandidates, w, h);

      let rowAnchors: Blob[] = [];
      if (seededAnchors && seededAnchors.length === 4) {
        const orderedSeed = orderCorners(seededAnchors.map((s) => ({ x: s.x, y: s.y })));
        const seededRail = orderedSeed
          ? collectRailAnchorsFromSeed(symmetricCandidates, seededAnchors, orderedSeed, w, h)
          : seededAnchors;
        rowAnchors = mergeAnchorSets(seededRail, columnAnchors);
      }
      if (rowAnchors.length < 4) rowAnchors = columnAnchors;
      if (rowAnchors.length < 4) rowAnchors = symmetricCandidates;

      console.log(`[OpenCVEngine] Anchors after pillar filtering: ${rowAnchors.length}`);
      if (rowAnchors.length < 4) {
        throw new Error(`ESTABILIDADE: detectei apenas ${rowAnchors.length} ancoras. Reenquadre a folha e tente novamente.`);
      }

      const minXBin = Math.min(...rowAnchors.map(a => a.x));
      const maxXBin = Math.max(...rowAnchors.map(a => a.x));
      const medX = (minXBin + maxXBin) / 2;

      const leftInitial = rowAnchors.filter(a => a.x < medX).sort((a, b) => a.y - b.y);
      const rightInitial = rowAnchors.filter(a => a.x >= medX).sort((a, b) => a.y - b.y);

      let topLeft: Blob | null = null;
      let topRight: Blob | null = null;
      if (leftInitial.length > 0 && rightInitial.length > 0) {
        for (const la of leftInitial) {
          let bestR: Blob | null = null;
          let bestDist = Number.POSITIVE_INFINITY;
          for (const ra of rightInitial) {
            const d = Math.abs(ra.y - la.y);
            if (d < bestDist) {
              bestDist = d;
              bestR = ra;
            }
          }
          if (bestR && bestDist < h * 0.15) {
            topLeft = la;
            topRight = bestR;
            break;
          }
        }
      }

      if (topLeft && topRight) {
        const angle = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x);
        console.log(`[OpenCVEngine] Block skew detected: ${(angle * 180 / Math.PI).toFixed(2)} deg`);

        const ox = topLeft.x;
        const oy = topLeft.y;
        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);

        rowAnchors = rowAnchors.map(b => {
          const rx = (b.x - ox) * cosA - (b.y - oy) * sinA + ox;
          const ry = (b.x - ox) * sinA + (b.y - oy) * cosA + oy;
          return { ...b, rx, ry, origX: b.x, origY: b.y };
        });

        allBlobs = allBlobs.map(b => {
          const rx = (b.x - ox) * cosA - (b.y - oy) * sinA + ox;
          const ry = (b.x - ox) * sinA + (b.y - oy) * cosA + oy;
          return { ...b, rx, ry, origX: b.x, origY: b.y };
        });
      } else {
        console.warn('[OpenCVEngine] Could not estimate skew from top pair. Using raw coordinates.');
        rowAnchors = rowAnchors.map(b => ({ ...b, rx: b.x, ry: b.y, origX: b.x, origY: b.y }));
        allBlobs = allBlobs.map(b => ({ ...b, rx: b.x, ry: b.y, origX: b.x, origY: b.y }));
      }

      const rxValues = rowAnchors.map(a => a.rx ?? a.x);
      const medRx = (Math.min(...rxValues) + Math.max(...rxValues)) / 2;
      const leftA = rowAnchors.filter(a => (a.rx ?? a.x) < medRx).sort((a, b) => (a.ry ?? a.y) - (b.ry ?? b.y));
      const rightA = rowAnchors.filter(a => (a.rx ?? a.x) >= medRx).sort((a, b) => (a.ry ?? a.y) - (b.ry ?? b.y));
      const minPairDx = w * 0.16;
      const maxPairDx = w * 0.96;
      let pairs = pairAnchorsByY(leftA, rightA, h * 0.07, minPairDx, maxPairDx);
      const totalRowsFallback = Math.max(2, gabarito.questions?.length || 0);
      const markerIndicesFallback = getMarkerIndices(totalRowsFallback);
      const cornerFallbackPairs = buildPairsFromCorners(
        lockedCorners,
        markerIndicesFallback,
        totalRowsFallback,
        getMedian(rowAnchors.map((a) => a.w)) || Math.max(7, Math.round(w * 0.014)),
      );

      if (pairs.length < 2) {
        if (cornerFallbackPairs.length >= 2) {
          pairs = cornerFallbackPairs;
          console.warn('[OpenCVEngine] Pairing fallback: locked corners (pre-rail).');
        } else {
          throw new Error('ESTABILIDADE: nao consegui parear as ancoras laterais com confianca.');
        }
      }
      rowAnchors = filterAnchorsByRailDistance(rowAnchors, pairs, w, h);
      const rxValuesFiltered = rowAnchors.map(a => a.rx ?? a.x);
      const medRxFiltered = (Math.min(...rxValuesFiltered) + Math.max(...rxValuesFiltered)) / 2;
      const leftAFiltered = rowAnchors
        .filter(a => (a.rx ?? a.x) < medRxFiltered)
        .sort((a, b) => (a.ry ?? a.y) - (b.ry ?? b.y));
      const rightAFiltered = rowAnchors
        .filter(a => (a.rx ?? a.x) >= medRxFiltered)
        .sort((a, b) => (a.ry ?? a.y) - (b.ry ?? b.y));
      pairs = pairAnchorsByY(leftAFiltered, rightAFiltered, h * 0.07, minPairDx, maxPairDx);
      if (pairs.length < 2) {
        if (cornerFallbackPairs.length >= 2) {
          pairs = cornerFallbackPairs;
          console.warn('[OpenCVEngine] Pairing fallback: locked corners (post-rail).');
        } else {
          throw new Error('ESTABILIDADE: ancoras apos filtro de trilho ficaram inconsistentes.');
        }
      }

      const qs = gabarito.questions;
      let qIndex = 0;
      const qPerColumn = qs.length;
      const numAlts = qs[0]?.alternatives?.length || 5;
      const ratios = altRatios(numAlts);
      const results: OmrQuestionResult[] = [];
      const markerIndices = getMarkerIndices(Math.min(qs.length, qPerColumn));
      const lockedFallbackPairs = buildPairsFromCorners(
        lockedCorners,
        markerIndices,
        Math.max(2, qPerColumn),
        getMedian(rowAnchors.map((a) => a.w)) || Math.max(7, Math.round(w * 0.014)),
      );

      if (pairs.length < markerIndices.length) {
        console.warn(`[OpenCVEngine] Found ${pairs.length} anchor pairs vs expected ${markerIndices.length}.`);
        if (pairs.length < 2 && lockedFallbackPairs.length >= 2) {
          pairs = lockedFallbackPairs;
          console.warn('[OpenCVEngine] Using locked-corners fallback pairs.');
        }
      }

      pairs = selectBestMarkerPairs(pairs, markerIndices.length, w, h);
      pairs = snapPairsToSideLines(pairs);
      const geometry = validateAnchorGeometry(pairs, w, h);
      if (!geometry.valid) {
        throw new Error(`ESTABILIDADE: geometria de ancoras invalida (${geometry.reason || 'shape'}).`);
      }

      if (expectedPx.length === 4 && pairs.length >= 2) {
        const topPair = pairs[0];
        const bottomPair = pairs[pairs.length - 1];
        const detectedCorners: AnchorDetectionCorner[] = [
          { x: topPair.left.origX ?? topPair.left.x, y: topPair.left.origY ?? topPair.left.y },
          { x: topPair.right.origX ?? topPair.right.x, y: topPair.right.origY ?? topPair.right.y },
          { x: bottomPair.right.origX ?? bottomPair.right.x, y: bottomPair.right.origY ?? bottomPair.right.y },
          { x: bottomPair.left.origX ?? bottomPair.left.x, y: bottomPair.left.origY ?? bottomPair.left.y },
        ];
        const guideDistNorm = mean(detectedCorners.map((c, i) =>
          distance(c, expectedPx[i]) / Math.max(1, Math.min(w, h) * 0.16),
        ));
        const guideScore = clamp01(1 - guideDistNorm);
        if (guideScore < 0.1 && geometry.score < 0.52) {
          throw new Error('ESTABILIDADE: ancoras finais fugiram da posicao travada no frame.');
        }
      }

      const anchorAtRow: Record<number, AnchorPair> = {};
      if (pairs.length > 0) {
        const count = Math.min(markerIndices.length, pairs.length);
        for (let i = 0; i < count; i++) {
          anchorAtRow[markerIndices[i]] = pairs[i];
        }
      }

      const anchorBubbleRadius = pairs[0]?.right ? Math.max(5, Math.round(pairs[0].right.w * 0.5)) : 9;
      const bubbleRadius = Math.max(6, Math.round(anchorBubbleRadius * 0.9));

      for (let rowInCol = 0; rowInCol < qPerColumn; rowInCol++) {
        if (qIndex >= qs.length) break;
        const q = qs[qIndex];

        let idxBefore = -1;
        let idxAfter = -1;
        for (let m = 0; m < markerIndices.length - 1; m++) {
          if (rowInCol >= markerIndices[m] && rowInCol <= markerIndices[m + 1]) {
            idxBefore = markerIndices[m];
            idxAfter = markerIndices[m + 1];
            break;
          }
        }

        let pairBefore = anchorAtRow[idxBefore];
        let pairAfter = anchorAtRow[idxAfter];

        if (!pairBefore || !pairAfter) {
          const refPair = pairBefore || pairAfter || pairs[0];
          if (refPair) {
            const refMkIdx = parseInt(Object.keys(anchorAtRow).find(k => anchorAtRow[Number(k)] === refPair) || '0', 10);
            const denom = Math.max(1, markerIndices[markerIndices.length - 1] - markerIndices[0]);
            const rowDist = (pairs.length >= 2) ? (pairs[pairs.length - 1].ry - pairs[0].ry) / denom : (refPair.right.w * 2.5);
            const dy = (rowInCol - refMkIdx) * rowDist;

            const lx = (refPair.left.origX ?? refPair.left.x);
            const ly = (refPair.left.origY ?? refPair.left.y) + dy;
            const rx = (refPair.right.origX ?? refPair.right.x);
            const ry = (refPair.right.origY ?? refPair.right.y) + dy;

            const fallbackBlobLeft: Blob = { ...refPair.left, origX: lx, origY: ly, x: lx, y: ly };
            const fallbackBlobRight: Blob = { ...refPair.right, origX: rx, origY: ry, x: rx, y: ry };
            pairBefore = { left: fallbackBlobLeft, right: fallbackBlobRight, ry: (ly + ry) / 2 };
            pairAfter = pairBefore;
            idxBefore = rowInCol;
            idxAfter = rowInCol;
          } else {
            qIndex++;
            continue;
          }
        }

        const span = (idxAfter - idxBefore) || 1;
        const frac = (rowInCol - idxBefore) / span;

        const pB = {
          lx: pairBefore.left.origX ?? pairBefore.left.x,
          ly: pairBefore.left.origY ?? pairBefore.left.y,
          rx: pairBefore.right.origX ?? pairBefore.right.x,
          ry: pairBefore.right.origY ?? pairBefore.right.y
        };
        const pA = {
          lx: pairAfter.left.origX ?? pairAfter.left.x,
          ly: pairAfter.left.origY ?? pairAfter.left.y,
          rx: pairAfter.right.origX ?? pairAfter.right.x,
          ry: pairAfter.right.origY ?? pairAfter.right.y
        };

        const qLX = pB.lx + frac * (pA.lx - pB.lx);
        const qLY = pB.ly + frac * (pA.ly - pB.ly);
        const qRX = pB.rx + frac * (pA.rx - pB.rx);
        const qRY = pB.ry + frac * (pA.ry - pB.ry);

        const altMetrics: Array<{ label: string; center: OmrPoint; density: number; score: number; contrast: number }> = [];
        for (let ai = 0; ai < numAlts; ai++) {
          const bx = qLX + ratios[ai] * (qRX - qLX);
          const by = qLY + ratios[ai] * (qRY - qLY);

          const centerDensity = sampleDensityFast(binData, w, h, bx, by, bubbleRadius * 0.72);
          const centerDark = sampleDarkness(grayData, w, h, bx, by, 0, bubbleRadius * 0.72);
          const ringDark = sampleDarkness(grayData, w, h, bx, by, bubbleRadius * 0.82, bubbleRadius * 1.25);
          const fillContrast = centerDark - ringDark;

          const contrastScore = clamp01((fillContrast + 0.1) / 0.45);
          const densityScore = clamp01((centerDensity - 0.06) / 0.55);
          const score = 0.58 * densityScore + 0.42 * contrastScore;

          altMetrics.push({
            label: q.alternatives[ai],
            center: { x: bx, y: by },
            density: centerDensity,
            score,
            contrast: fillContrast
          });
        }

        const sorted = [...altMetrics].sort((a, b) => b.score - a.score);
        const best = sorted[0];
        const second = sorted[1];

        const scoreValues = altMetrics.map(a => a.score);
        const meanScore = mean(scoreValues);
        const variance = scoreValues.reduce((s, v) => s + (v - meanScore) * (v - meanScore), 0) / Math.max(1, scoreValues.length);
        const stdDev = Math.sqrt(variance);

        const dynamicThreshold = Math.max(0.27, meanScore + Math.max(0.08, stdDev * 1.2));
        const marginThreshold = Math.max(0.05, stdDev * 0.55);
        const bestToMean = best.score - meanScore;
        const markThreshold = Math.max(0.22, dynamicThreshold - 0.05);
        const relativeScoreFloor = best.score * 0.78;
        const relativeDensityFloor = best.density * 0.72;

        const markedCandidates = [...altMetrics]
          .filter(a =>
            (
              a.score >= markThreshold &&
              a.density >= 0.11 &&
              a.contrast >= -0.01
            ) ||
            (
              a.score >= relativeScoreFloor &&
              a.density >= Math.max(0.12, relativeDensityFloor) &&
              a.contrast >= -0.01
            )
          )
          .sort((a, b) => b.score - a.score);

        const secondCandidate = markedCandidates[1] ?? second;
        const secondIsStrong = !!secondCandidate && (
          (
            secondCandidate.score >= (dynamicThreshold - 0.04) &&
            secondCandidate.density >= 0.115 &&
            secondCandidate.contrast >= -0.01
          ) ||
          (
            secondCandidate.score >= best.score * 0.78 &&
            secondCandidate.density >= Math.max(0.12, best.density * 0.72)
          )
        );
        const isMultipleMarked = markedCandidates.length >= 2 && secondIsStrong;

        const hasStrongWinner = best.score >= dynamicThreshold && best.density >= 0.1 && bestToMean >= 0.035;
        const isAmbiguous = !!second && second.score >= (dynamicThreshold - 0.01) && (best.score - second.score) < marginThreshold;
        const chosenLabel = hasStrongWinner && !isAmbiguous && !isMultipleMarked ? best.label : null;
        const confidence = clamp01((best.score - (second?.score ?? 0)) * 1.4 + (best.score - dynamicThreshold) * 0.8 + 0.5);

        const isAnnulled = q.status === 'annulled';
        const benefitedPoints = q.pointsBenefited !== false;
        const multipleDetectedAnswers = isMultipleMarked
          ? markedCandidates
              .filter(a => a.score >= Math.max(markThreshold - 0.015, best.score - 0.20))
              .map(a => a.label)
          : [];

        const altData = altMetrics.map((a) => ({
          label: a.label,
          density: a.density,
          center: a.center,
          isDetected: isMultipleMarked ? multipleDetectedAnswers.includes(a.label) : chosenLabel === a.label
        }));

        let status: OmrQuestionResult['status'] = 'none';
        if (isAnnulled) status = 'annulled';
        else if (!hasStrongWinner) status = 'none';
        else if (isMultipleMarked || isAmbiguous) status = 'multiple';
        else status = chosenLabel === q.correctAnswer ? 'correct' : 'wrong';

        const isCorrect = !isAnnulled && chosenLabel !== null && chosenLabel === q.correctAnswer;
        const earnedPoints = isAnnulled ? (benefitedPoints ? q.points : 0) : (isCorrect ? q.points : 0);

        results.push({
          number: q.number,
          detectedAnswer: chosenLabel,
          correctAnswer: q.correctAnswer,
          alternatives: altData,
          status,
          isCorrect,
          isMultiple: status === 'multiple',
          multipleDetectedAnswers: multipleDetectedAnswers.length > 0 ? multipleDetectedAnswers : undefined,
          isAnnulled,
          earnedPoints,
          points: q.points,
          confidence
        });

        qIndex++;
      }

      console.log('[OpenCVEngine] Analysis completed successfully.');

      const lowConfidenceCount = results.filter(r => (r.confidence ?? 0) < 0.42).length;
      const unresolvedCount = results.filter(r => r.status === 'none').length;
      const avgConfidence = results.reduce((s, r) => s + (r.confidence ?? 0), 0) / Math.max(1, results.length);
      const unresolvedRatio = unresolvedCount / Math.max(1, results.length);

      if (avgConfidence < 0.45 || unresolvedRatio > 0.35 || lowConfidenceCount > Math.round(results.length * 0.5)) {
        throw new Error(
          `LEITURA_INSTAVEL: baixa confianca media (${avgConfidence.toFixed(2)}), ${unresolvedCount}/${results.length} questoes incertas. Reenquadre e tente novamente.`
        );
      }

      try {
        const packagerIp = Constants?.expoConfig?.hostUri?.split(':')[0];
        if (packagerIp) {
          fetch(`http://${packagerIp}:4000/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              w,
              h,
              totalBlobs: allBlobs.length,
              rowAnchorsCount: rowAnchors.length,
              minXBin,
              maxXBin,
              leftInitialCount: leftInitial.length,
              rightInitialCount: rightInitial.length,
              pairsCount: pairs.length,
              firstPair: pairs.length > 0 ? pairs[0] : null
            })
          }).catch(() => {});
        }
      } catch {}

      OpenCV.clearBuffers();

      return {
        gabaritoId: gabarito.id,
        totalQuestions: results.length,
        totalCorrect: results.filter(r => r.isCorrect).length,
        totalPoints: +results.reduce((s, r) => (s + (r.points || 0)), 0).toFixed(2),
        earnedPoints: +results.reduce((s, r) => (s + (r.earnedPoints || 0)), 0).toFixed(2),
        totalScore: +results.reduce((s, r) => (s + (r.earnedPoints || 0)), 0).toFixed(2),
        questions: results,
        anchors: {
          all: pairs.flatMap((p: AnchorPair) => [
            { x: p.left.origX ?? p.left.x, y: p.left.origY ?? p.left.y },
            { x: p.right.origX ?? p.right.x, y: p.right.origY ?? p.right.y },
          ]),
          imageWidth: w,
          imageHeight: h
        }
      };
    } catch (error) {
      OpenCV.clearBuffers();
      console.error('[OpenCVEngine] OpenCV error in OMR pipeline.', error);
      throw error;
    }
  }
}
