document.addEventListener("DOMContentLoaded", function() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('output');
    const context = canvas.getContext('2d');
    const bgColorPicker = document.getElementById('bgColorPicker');
    const glowEffectToggle = document.getElementById('glowEffectToggle'); // Checkbox to toggle glow effect

    let backgroundColor = {r: 0, g: 0, b: 0, a: 255}; // Default black

    bgColorPicker.addEventListener('change', function() {
        const hex = bgColorPicker.value;
        const rgb = hexToRgb(hex);
        backgroundColor = {r: rgb.r, g: rgb.g, b: rgb.b, a: 255};
    });

    async function loadModelAndProcess() {
        const net = await bodyPix.load();

        function processFrame() {
            net.segmentPerson(video, {
                internalResolution: 'medium',
                segmentationThreshold: 0.7
            }).then(segmentation => {
                context.clearRect(0, 0, canvas.width, canvas.height); // Clear previous frame

                // Prepare mask with dynamic background color
                const mask = bodyPix.toMask(segmentation, {r: 0, g: 0, b: 0, a: 0}, backgroundColor);

                // Draw the mask
                bodyPix.drawMask(
                    canvas, video, mask, 1, 0, false
                );

                // Now apply pixelation effect
                pixelate(canvas, context);

                // Conditionally draw glow around the person
                if (glowEffectToggle.checked) {
                    drawGlow(segmentation, context);
                }
            });

            requestAnimationFrame(processFrame);
        }

        processFrame();
    }

    function drawGlow(segmentation, context) {
        const edgeColor = getContrastingColor(backgroundColor);
        context.globalCompositeOperation = 'source-over';
        const edgeWidth = 3;
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixelData = imageData.data;

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const index = (x + y * canvas.width) * 4;
                if (segmentation.data[x + y * segmentation.width] === 1) {
                    // Set the color of the outline
                    pixelData[index] = edgeColor.r;
                    pixelData[index + 1] = edgeColor.g;
                    pixelData[index + 2] = edgeColor.b;
                    pixelData[index + 3] = 255; // Full opacity
                }
            }
        }

        context.putImageData(imageData, 0, 0);
    }

    function pixelate(canvas, context) {
        const pixelation = 10; // Higher number = more pixelation
        const width = canvas.width / pixelation;
        const height = canvas.height / pixelation;

        context.drawImage(canvas, 0, 0, width, height);
        context.mozImageSmoothingEnabled = false;
        context.webkitImageSmoothingEnabled = false;
        context.msImageSmoothingEnabled = false;
        context.imageSmoothingEnabled = false;
        context.drawImage(canvas, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
    }

    function hexToRgb(hex) {
        var r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16);
        return {r, g, b};
    }

    function getContrastingColor(bgColor) {
        return {
            r: bgColor.r > 128 ? 0 : 255,
            g: bgColor.g > 128 ? 0 : 255,
            b: bgColor.b > 128 ? 0 : 255
        };
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                video.srcObject = stream;
                video.onloadedmetadata = function() {
                    loadModelAndProcess();
                };
            })
            .catch(function(error) {
                console.error("Cannot access the camera, error:", error);
            });
    } else {
        console.error("getUserMedia is not supported by this browser.");
    }
});
