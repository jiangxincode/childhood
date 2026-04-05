document.getElementById('convert-btn').addEventListener('click', () => {
    const hexString = document.getElementById('input-area').value.trim();
    if (!hexString) {
        document.getElementById('output-area').value = '';
        return;
    }
    try {
        const bytes = hex2bytes(hexString);
        const jsonString = bytesDecoder(bytes);
        document.getElementById('output-area').value = jsonString;
    } catch (e) {
        document.getElementById('output-area').value = 'Error: ' + e.message;
    }
});
