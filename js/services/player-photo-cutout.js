/**
 * Recorte automático experimental para tarjetas de jugador.
 *
 * Esta primera integración está deliberadamente limitada a la tarjeta que se
 * está validando. El proceso ocurre 100% en el navegador y nunca modifica el
 * archivo original de assets/students. Los PNG con transparencia se muestran
 * directamente, sin volver a procesar el fondo.
 */
export function createAutomaticPlayerCutout(stage, src) {
  if (!stage || !src) return;
  if (stage.dataset.cutoutReady === '1' || stage.dataset.cutoutLoading === '1') return;
  stage.dataset.cutoutLoading = '1';

  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    try {
      // Las nuevas fotografías PNG ya vienen recortadas y con transparencia.
      // No debemos volver a procesarlas: el algoritmo de fondo negro puede
      // alterar los bordes del cabello y producir halos/cambios de tono.
      if (/\.png(?:[?#].*)?$/i.test(src) && hasTransparency(img)) {
        showOriginalImage(stage, img);
        return;
      }

      const canvas = removeBlackBackground(img);
      canvas.className = 'pcard-cutout-canvas';
      canvas.setAttribute('aria-label', 'Fotografía recortada');
      stage.replaceChildren(canvas);
      stage.dataset.cutoutReady = '1';
      stage.dataset.cutoutLoading = '0';
    } catch (error) {
      console.warn('[INVICTUS] No fue posible procesar el recorte automático:', error);
      showFallback(stage, src);
    }
  };
  img.onerror = () => showFallback(stage, src);
  img.src = src;
}

function hasTransparency(source) {
  const maxSide = 160;
  const nw = source.naturalWidth || source.width;
  const nh = source.naturalHeight || source.height;
  const scale = Math.min(1, maxSide / nw, maxSide / nh);
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  const alpha = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < alpha.length; i += 4) {
    if (alpha[i] < 250) return true;
  }
  return false;
}

function showOriginalImage(stage, img) {
  stage.dataset.cutoutLoading = '0';
  img.className = 'pcard-cutout-canvas';
  img.alt = 'Fotografía del jugador';
  stage.replaceChildren(img);
  stage.dataset.cutoutReady = '1';
}

function showFallback(stage, src) {
  stage.dataset.cutoutLoading = '0';
  const img = document.createElement('img');
  img.className = 'pcard-photo-fallback';
  img.src = src;
  img.alt = 'Fotografía del jugador';
  stage.replaceChildren(img);
}

function removeBlackBackground(source) {
  // V12.5: recorte conservador/adaptativo con protección específica de cabello.
  // La prioridad es conservar cabello oscuro aunque quede un halo mínimo de fondo.
  // El objetivo NO es "borrar píxeles oscuros", sino detectar únicamente
  // el fondo oscuro conectado a los bordes. El cabello oscuro queda protegido.
  const maxSide = 1100;
  const nw = source.naturalWidth || source.width;
  const nh = source.naturalHeight || source.height;
  const scale = Math.min(1, maxSide / nw, maxSide / nh);
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);

  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;
  const total = w * h;
  const bg = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const margin = Math.max(2, Math.round(Math.min(w, h) * 0.015));
  const step = Math.max(1, Math.floor(Math.min(w, h) / 30));
  const pixel = (x, y) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Estimamos el fondo usando exclusivamente muestras periféricas.
  const samples = [];
  for (let x = margin; x < w - margin; x += step) {
    samples.push(pixel(x, margin));
    samples.push(pixel(x, h - 1 - margin));
  }
  for (let y = margin; y < h - margin; y += step) {
    samples.push(pixel(margin, y));
    samples.push(pixel(w - 1 - margin, y));
  }

  const dark = samples.filter(v => luma(...v) < 105);
  const chosen = dark.length >= 4 ? dark : samples;
  chosen.sort((a, b) => luma(...a) - luma(...b));
  const median = chosen[Math.floor(chosen.length / 2)] || [0, 0, 0];
  const br = median[0], bgc = median[1], bb = median[2];
  const bgLum = luma(br, bgc, bb);

  const distance = i => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.sqrt((r - br) ** 2 + (g - bgc) ** 2 + (b - bb) ** 2);
  };

  // Tolerancia base deliberadamente menor que en V12.3.
  // Si el fondo es realmente negro, 24-30 es suficiente y evita comerse cabello.
  // Parámetros V12.5: menos agresivos que V12.4.
  // No intentamos alcanzar 100% de eliminación: protegemos detalles oscuros.
  const baseTolerance = Math.max(16, Math.min(24, 18 + Math.round((bgLum / 255) * 6)));
  const seedTolerance = Math.max(10, Math.round(baseTolerance * 0.60));
  const edgeTolerance = Math.max(9, Math.round(baseTolerance * 0.45));
  const hairProtectionVariance = 7.5;
  const hairProtectionChroma = 9;

  const localLumaVariance = (x, y) => {
    const x0 = Math.max(0, x - 1), x1 = Math.min(w - 1, x + 1);
    const y0 = Math.max(0, y - 1), y1 = Math.min(h - 1, y + 1);
    let sum = 0, sum2 = 0, n = 0;
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const qi = (yy * w + xx) * 4;
        const v = luma(data[qi], data[qi + 1], data[qi + 2]);
        sum += v; sum2 += v * v; n++;
      }
    }
    const mean = sum / n;
    return Math.max(0, sum2 / n - mean * mean);
  };

  const looksLikeHairOrSubjectDetail = (i, tolerance) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = luma(r, g, b);
    const x = ((i / 4) % w) | 0;
    const y = ((i / 4 / w)) | 0;
    const variance = localLumaVariance(x, y);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    // Cabello oscuro suele tener textura/color aunque su luminancia sea baja.
    // Un fondo negro uniforme no presenta esas dos señales.
    return variance >= hairProtectionVariance || chroma >= hairProtectionChroma || lum > Math.min(88, bgLum + tolerance * 0.90);
  };

  const isBackgroundCandidate = (i, tolerance) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = luma(r, g, b);
    // Además del color, exigimos que siga siendo un tono de fondo oscuro.
    // Esto evita que una zona de cabello oscuro sea absorbida por una fuga.
    if (distance(i) > tolerance || lum > Math.min(88, bgLum + tolerance * 0.95)) return false;
    // Protección de detalles: jamás absorbemos un píxel oscuro texturizado
    // si está en una zona de transición. Para semillas periféricas sí permitimos
    // el fondo uniforme, porque allí no hay cabello.
    return true;
  };

  const enqueue = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    visited[p] = 1;
    queue[tail++] = p;
  };

  // Semillas muy estrictas: solo puntos periféricos inequívocamente pertenecientes
  // al fondo. Nunca sembramos desde una zona interior donde pueda haber cabello.
  for (let x = 0; x < w; x++) {
    if (isBackgroundCandidate(x * 4, seedTolerance)) enqueue(x, 0);
    if (isBackgroundCandidate(((h - 1) * w + x) * 4, seedTolerance)) enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    if (isBackgroundCandidate((y * w) * 4, seedTolerance)) enqueue(0, y);
    if (isBackgroundCandidate((y * w + w - 1) * 4, seedTolerance)) enqueue(w - 1, y);
  }

  // Expansión conservadora. Cerca de un borde de alto contraste reducimos aún más
  // la tolerancia: es precisamente donde suele encontrarse el cabello.
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    const y = (p / w) | 0;
    const i = p * 4;
    if (!isBackgroundCandidate(i, baseTolerance)) continue;
    bg[p] = 1;

    const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const np = ny * w + nx;
      if (visited[np]) continue;
      const ni = np * 4;

      // Si el píxel candidato forma una transición fuerte hacia una zona clara,
      // exigimos mayor semejanza al fondo. Esta protección reduce la pérdida de cabello.
      let localContrast = 0;
      let count = 0;
      for (let yy = Math.max(0, ny - 1); yy <= Math.min(h - 1, ny + 1); yy++) {
        for (let xx = Math.max(0, nx - 1); xx <= Math.min(w - 1, nx + 1); xx++) {
          if (xx === nx && yy === ny) continue;
          const qi = (yy * w + xx) * 4;
          localContrast += Math.abs(luma(data[ni], data[ni + 1], data[ni + 2]) - luma(data[qi], data[qi + 1], data[qi + 2]));
          count++;
        }
      }
      localContrast /= count || 1;
      const tol = localContrast > 30 ? edgeTolerance : baseTolerance;
      if (isBackgroundCandidate(ni, tol)) {
        const protectedDetail = looksLikeHairOrSubjectDetail(ni, tol);
        // En la expansión normal, un detalle oscuro con textura/color se considera
        // parte de la persona, aunque su tono esté cerca del fondo.
        if (!protectedDetail || localContrast < 14) enqueue(nx, ny);
      }
    }
  }

  // La zona negra inferior puede quedar encerrada debajo de los hombros.
  // Aquí también usamos una tolerancia conservadora y nunca tocamos la zona superior.
  const lowerStart = Math.floor(h * 0.70);
  for (let x = 0; x < w; x++) {
    for (let y = h - 1; y >= lowerStart; y--) {
      const p = y * w + x;
      if (bg[p]) continue;
      const i = p * 4;
      if (isBackgroundCandidate(i, edgeTolerance) && !looksLikeHairOrSubjectDetail(i, edgeTolerance)) bg[p] = 1;
      else break;
    }
  }

  // Alpha: no volvemos transparente todo lo que toque la máscara.
  // Solo suavizamos píxeles que están muy cerca del color del fondo.
  const alpha = new Uint8Array(total);
  for (let p = 0; p < total; p++) alpha[p] = bg[p] ? 0 : 255;
  for (let p = 0; p < total; p++) {
    if (bg[p]) continue;
    const x = p % w, y = (p / w) | 0;
    let nearBg = 0;
    for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) {
      for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
        if (bg[yy * w + xx]) nearBg++;
      }
    }
    const i = p * 4;
    const d = distance(i);
    if (nearBg && d <= baseTolerance * 1.30) {
      // Borde gradual: evita que una hebra de cabello termine en 0% de opacidad
      // por una diferencia mínima respecto del negro.
      const ratio = Math.max(0, Math.min(1, (d - baseTolerance * 0.45) / (baseTolerance * 0.85)));
      const edgeAlpha = Math.round(55 + ratio * 200);
      alpha[p] = Math.max(220, edgeAlpha, 255 - Math.round((nearBg / 8) * 18));
    }
  }

  for (let p = 0; p < total; p++) data[p * 4 + 3] = alpha[p];
  ctx.putImageData(image, 0, 0);

  // Recorte del lienzo al contenido visible.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] > 18) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return canvas;
  const padX = Math.round(w * 0.018);
  const padTop = Math.round(h * 0.012);
  const sx = Math.max(0, minX - padX);
  const sy = Math.max(0, minY - padTop);
  const ex = Math.min(w - 1, maxX + padX);
  const ey = Math.min(h - 1, maxY);
  const cropped = document.createElement('canvas');
  cropped.width = ex - sx + 1;
  cropped.height = ey - sy + 1;
  cropped.getContext('2d').drawImage(canvas, sx, sy, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  return cropped;
}
