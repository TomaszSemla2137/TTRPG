document.addEventListener('DOMContentLoaded', function () {
    const playButton = document.getElementById('playButton');
    if (!playButton) return;
    playButton.addEventListener('click', function () {
        // logowanie.html znajduje się w folderze 'Code', więc używamy ścieżki lokalnej
        window.location.href = 'logowanie.html';
    });
});