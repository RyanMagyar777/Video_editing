document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
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

    // Sliders
const sliders = {
    // existing...
    red_gain: document.getElementById('red_gain'),
    green_gain: document.getElementById('green_gain'),
    blue_gain: document.getElementById('blue_gain'),

    smear_r: document.getElementById('smear_r'),
    smear_g: document.getElementById('smear_g'),
    smear_b: document.getElementById('smear_b'),

    smear_x: document.getElementById('smear_x'),
    smear_y: document.getElementById('smear_y')
};

    // State
    let videoURL = null;
    let isExporting = false;
    let currentMediaType = null;

    // Default filters
   const defaultFilters = {
    // existing...
    red_gain: '100',
    green_gain: '100',
    blue_gain: '100',

    smear_r: '0',
    smear_g: '0',
    smear_b: '0',

    smear_x: '0',
    smear_y: '0'
};

    // File Upload Handlers
    uploadBtn.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBtn.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        uploadBtn.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBtn.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
            alert('Please select a valid video or image file.');
            return;
        }

        if (videoURL) {
            URL.revokeObjectURL(videoURL);
        }

        currentMediaType = file.type.startsWith('video/') ? 'video' : 'image';
        videoURL = URL.createObjectURL(file);
        
        emptyState.classList.add('hidden');
        
        if (currentMediaType === 'video') {
            videoPreview.src = videoURL;
            videoPreview.load();
            videoPreview.classList.remove('hidden');
            if (imagePreview) imagePreview.classList.add('hidden');
            exportBtnText.textContent = 'Export Video';
        } else {
            imagePreview.src = videoURL;
            videoPreview.classList.add('hidden');
            imagePreview.classList.remove('hidden');
            videoPreview.pause();
            exportBtnText.textContent = 'Export Image';
        }

        exportBtn.classList.remove('disabled');
        exportBtn.disabled = false;
        
        applyFilters();
    }

    // Filter Logic
    function getFilterString() {
        let b = parseInt(sliders.brightness.value);
        let c = parseInt(sliders.contrast.value);
        let s = parseInt(sliders.saturation.value);
        let t = parseInt(sliders.temperature.value);
        let hl = parseInt(sliders.highlights.value);
        let grad = parseInt(sliders.grading.value);
        let h = parseInt(sliders.hue.value);
        let v = parseInt(sliders.vibrance.value);
        let w = parseInt(sliders.whites.value);
        let g = parseInt(sliders.gamma.value);
        let hsl = parseInt(sliders.hsl.value);
        let luts = parseInt(sliders.luts.value);
        let curves = parseInt(sliders.curves.value);
        let f = parseInt(sliders.fade.value);
        let dz = parseInt(sliders.dehaze.value);
        let cla = parseInt(sliders.clarity.value);
        let vig = parseInt(sliders.vignette.value);
        let cb = parseInt(sliders.color_balance.value);
        let st = parseInt(sliders.split_toning.value);
        let rgb = parseInt(sliders.rgb_channels.value);
        let sc = parseInt(sliders.selective_color.value);

        // Approximate complex edits into CSS filters
        let finalBrightness = b + (w * 0.5) + (hl * 0.3) + (f * 0.2) - (vig * 0.2);
        let finalContrast = c + (curves * 0.5) + (g > 100 ? (g-100)*0.2 : 0) + (hl * 0.1) - (f * 0.3) + (dz * 0.4) + (cla * 0.2) + (rgb * 0.2);
        let finalSaturate = s * (v / 100) + (hsl * 0.5) + (grad > 0 ? grad*0.5 : 0) + (dz * 0.2) + (sc * 0.4);
        let finalHue = h + (t * 0.5) + (grad * 0.2) + (cb * 0.5) + (st * 0.3);
        let finalSepia = Math.abs(t) * 0.3 + (luts * 0.4) + Math.abs(st) * 0.2;

        return `
            brightness(${finalBrightness}%)
            contrast(${finalContrast}%)
            saturate(${finalSaturate}%)
            hue-rotate(${finalHue}deg)
            sepia(${finalSepia}%)
        `.trim();
    }

    function applyFilters() {
        function applyChromaSmear(ctx, width, height) {
    const img = ctx.getImageData(0, 0, width, height);
    const data = img.data;

    const rGain = sliders.red_gain.value / 100;
    const gGain = sliders.green_gain.value / 100;
    const bGain = sliders.blue_gain.value / 100;

    const smearR = parseInt(sliders.smear_r.value);
    const smearG = parseInt(sliders.smear_g.value);
    const smearB = parseInt(sliders.smear_b.value);

    const smearX = parseInt(sliders.smear_x.value);
    const smearY = parseInt(sliders.smear_y.value);

    const copy = new Uint8ClampedArray(data);

    function sample(x, y, channelOffset) {
        x = Math.max(0, Math.min(width - 1, x));
        y = Math.max(0, Math.min(height - 1, y));
        return copy[(y * width + x) * 4 + channelOffset];
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            const i = (y * width + x) * 4;

            // directional offsets
            let rx = x - smearX * smearR * 0.1;
            let ry = y - smearY * smearR * 0.1;

            let gx = x - smearX * smearG * 0.05;
            let gy = y - smearY * smearG * 0.05;

            let bx = x + smearX * smearB * 0.1;
            let by = y + smearY * smearB * 0.1;

            let r = sample(rx, ry, 0) * rGain;
            let g = sample(gx, gy, 1) * gGain;
            let b = sample(bx, by, 2) * bGain;

            data[i]     = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
    }

    ctx.putImageData(img, 0, 0);
}

    // Add event listeners to all sliders
    Object.values(sliders).forEach(slider => {
        slider.addEventListener('input', applyFilters);
    });

    // Reset Button
    resetBtn.addEventListener('click', () => {
        for (const [key, slider] of Object.entries(sliders)) {
            slider.value = defaultFilters[key];
        }
        applyFilters();
    });

    // Export Logic
    exportBtn.addEventListener('click', async () => {
        if (!videoURL || isExporting) return;
        
        if (currentMediaType === 'image') {
            exportImage();
            return;
        }

        isExporting = true;
        exportBtn.classList.add('disabled');
        exportBtn.disabled = true;
        
        // Show progress UI
        exportStatus.classList.remove('hidden');
        exportProgress.style.width = '0%';
        exportText.textContent = 'Preparing export...';
        
        const canvas = document.getElementById('export-canvas');
        const ctx = canvas.getContext('2d');
        
        // Setup canvas size
        canvas.width = videoPreview.videoWidth;
        canvas.height = videoPreview.videoHeight;
        
        // Apply filter to canvas context
        ctx.filter = getFilterString();
        
        // Prepare MediaRecorder on canvas stream
        const stream = canvas.captureStream(30); // 30 FPS
        const chunks = [];
        
        // Check supported formats
        let mimeType = 'video/webm; codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm; codecs=vp8';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }
        }

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
        
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'ChromaEdit_Export.webm';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            // Revert state
            isExporting = false;
            exportBtn.classList.remove('disabled');
            exportBtn.disabled = false;
            exportStatus.classList.add('hidden');
            
            // Restore original video UI
            videoPreview.muted = false;
            videoPreview.controls = true;
        };

        // Prepare video for rendering
        const duration = videoPreview.duration;
        videoPreview.currentTime = 0;
        videoPreview.muted = true; // Mute to allow auto-play without user interaction on some browsers
        videoPreview.controls = false;
        
        exportText.textContent = 'Processing video...';
        
        // Start playing the video normally and draw frames onto canvas on each animation frame
        recorder.start();
        
        let drawInterval;
        let didPlay = false;

        const handleVideoEnd = () => {
            cancelAnimationFrame(drawInterval);
            recorder.stop();
            videoPreview.removeEventListener('ended', handleVideoEnd);
            videoPreview.removeEventListener('timeupdate', updateProgress);
        };

        const updateProgress = () => {
            const pct = Math.min(100, Math.round((videoPreview.currentTime / duration) * 100));
            exportProgress.style.width = pct + '%';
            exportText.textContent = `Processing frame: ${pct}%`;
        };

       const drawFrame = () => {
    if (!videoPreview.paused && !videoPreview.ended) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // base image
        ctx.filter = getFilterString();
        ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);

        // chroma smear pass
        applyChromaSmear(ctx, canvas.width, canvas.height);
    }
    drawInterval = requestAnimationFrame(drawFrame);
};

        videoPreview.addEventListener('ended', handleVideoEnd);
        videoPreview.addEventListener('timeupdate', updateProgress);
        
        try {
            await videoPreview.play();
            drawFrame();
        } catch (err) {
            console.error('Export playback failed', err);
            exportText.textContent = 'Export failed: Autoplay prevented.';
            isExporting = false;
            recorder.stop();
            exportStatus.classList.add('hidden');
        }
    });

    function exportImage() {
        const canvas = document.getElementById('export-canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = imagePreview.naturalWidth;
        canvas.height = imagePreview.naturalHeight;
        
        ctx.filter = getFilterString();
        ctx.drawImage(imagePreview, 0, 0, canvas.width, canvas.height);
        
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'ChromaEdit_Photo.png';
        a.click();
    }
});
