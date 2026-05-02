document.addEventListener('DOMContentLoaded', () => {

    const dropZone = document.getElementById('drop-zone');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('media-upload');
    const videoPreview = document.getElementById('preview-video');
    const imagePreview = document.getElementById('preview-image');
    const emptyState = document.getElementById('empty-state');
    const exportBtn = document.getElementById('export-btn');
    const resetBtn = document.getElementById('reset-btn');
    const exportStatus = document.getElementById('export-status');
    const exportProgress = document.getElementById('export-progress');
    const exportText = document.getElementById('export-text');
    const exportBtnText = document.getElementById('export-btn-text');

    const sliders = {
        brightness: document.getElementById('brightness'),
        contrast: document.getElementById('contrast'),
        saturation: document.getElementById('saturation'),
        hue: document.getElementById('hue'),
        vignette: document.getElementById('vignette'),

        // NEW EFFECT CONTROLS
        red_gain: document.getElementById('red_gain'),
        green_gain: document.getElementById('green_gain'),
        blue_gain: document.getElementById('blue_gain'),

        smear_r: document.getElementById('smear_r'),
        smear_g: document.getElementById('smear_g'),
        smear_b: document.getElementById('smear_b'),

        smear_x: document.getElementById('smear_x'),
        smear_y: document.getElementById('smear_y')
    };

    let videoURL = null;
    let isExporting = false;
    let currentMediaType = null;

    const defaultFilters = {
        brightness: '100',
        contrast: '100',
        saturation: '100',
        hue: '0',
        vignette: '0',

        red_gain: '100',
        green_gain: '100',
        blue_gain: '100',

        smear_r: '0',
        smear_g: '0',
        smear_b: '0',

        smear_x: '0',
        smear_y: '0'
    };

    uploadBtn.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
    };

    function handleFile(file) {
        if (videoURL) URL.revokeObjectURL(videoURL);

        videoURL = URL.createObjectURL(file);
        currentMediaType = file.type.startsWith('video') ? 'video' : 'image';

        emptyState.classList.add('hidden');

        if (currentMediaType === 'video') {
            videoPreview.src = videoURL;
            videoPreview.classList.remove('hidden');
            imagePreview.classList.add('hidden');
        } else {
            imagePreview.src = videoURL;
            imagePreview.classList.remove('hidden');
            videoPreview.classList.add('hidden');
        }

        exportBtn.disabled = false;
        applyFilters();
    }

    function getFilterString() {
        return `
            brightness(${sliders.brightness.value}%)
            contrast(${sliders.contrast.value}%)
            saturate(${sliders.saturation.value}%)
            hue-rotate(${sliders.hue.value}deg)
        `;
    }

    function applyFilters() {
        const f = getFilterString();

        if (currentMediaType === 'video') {
            videoPreview.style.filter = f;
        } else {
            imagePreview.style.filter = f;
        }
    }

    Object.values(sliders).forEach(s => s.addEventListener('input', applyFilters));

    resetBtn.onclick = () => {
        for (let k in defaultFilters) sliders[k].value = defaultFilters[k];
        applyFilters();
    };

    // =========================
    // 🔴 CHROMA SMEAR EFFECT
    // =========================
    function applyChromaSmear(ctx, w, h) {
        const img = ctx.getImageData(0, 0, w, h);
        const d = img.data;
        const copy = new Uint8ClampedArray(d);

        const rGain = sliders.red_gain.value / 100;
        const gGain = sliders.green_gain.value / 100;
        const bGain = sliders.blue_gain.value / 100;

        const smearR = +sliders.smear_r.value;
        const smearG = +sliders.smear_g.value;
        const smearB = +sliders.smear_b.value;

        const smearX = +sliders.smear_x.value;
        const smearY = +sliders.smear_y.value;

        const sample = (x, y, c) => {
            x = Math.max(0, Math.min(w - 1, x));
            y = Math.max(0, Math.min(h - 1, y));
            return copy[(y * w + x) * 4 + c];
        };

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {

                const i = (y * w + x) * 4;

                const rx = x - smearX * smearR * 0.1;
                const gx = x - smearX * smearG * 0.05;
                const bx = x + smearX * smearB * 0.1;

                const ry = y - smearY * smearR * 0.1;
                const gy = y - smearY * smearG * 0.05;
                const by = y + smearY * smearB * 0.1;

                d[i]     = sample(rx, ry, 0) * rGain;
                d[i + 1] = sample(gx, gy, 1) * gGain;
                d[i + 2] = sample(bx, by, 2) * bGain;
            }
        }

        ctx.putImageData(img, 0, 0);
    }

    // =========================
    // EXPORT
    // =========================
    exportBtn.onclick = async () => {
        if (!videoURL || isExporting) return;

        const canvas = document.getElementById('export-canvas');
        const ctx = canvas.getContext('2d');

        if (currentMediaType === 'image') {
            canvas.width = imagePreview.naturalWidth;
            canvas.height = imagePreview.naturalHeight;

            ctx.filter = getFilterString();
            ctx.drawImage(imagePreview, 0, 0);

            applyChromaSmear(ctx, canvas.width, canvas.height);

            const a = document.createElement('a');
            a.href = canvas.toDataURL();
            a.download = 'export.png';
            a.click();
            return;
        }

        isExporting = true;

        canvas.width = videoPreview.videoWidth;
        canvas.height = videoPreview.videoHeight;

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.ondataavailable = e => chunks.push(e.data);

        recorder.onstop = () => {
            const blob = new Blob(chunks);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'export.webm';
            a.click();
            isExporting = false;
        };

        recorder.start();

        const draw = () => {
            if (!videoPreview.paused && !videoPreview.ended) {
                ctx.filter = getFilterString();
                ctx.drawImage(videoPreview, 0, 0);

                applyChromaSmear(ctx, canvas.width, canvas.height);

                requestAnimationFrame(draw);
            } else {
                recorder.stop();
            }
        };

        videoPreview.currentTime = 0;
        await videoPreview.play();
        draw();
    };

});
